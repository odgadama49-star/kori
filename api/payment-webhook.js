const crypto = require("node:crypto");
const { send, admin, pendingPayment, activateSubscription, PLAN_AMOUNT_XOF } = require("../server/payments");

module.exports.config = { api: { bodyParser: false } };
async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  const chunks=[]; for await (const chunk of req) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks).toString("utf8");
}
function waveValid(header, body, secret) {
  if (!header || !secret) return false;
  const parts=header.split(","); const timestamp=parts.find(v=>v.startsWith("t="))?.slice(2);
  const signatures=parts.filter(v=>v.startsWith("v1=")).map(v=>v.slice(3));
  if(!timestamp||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
  const digest=crypto.createHmac("sha256",secret).update(timestamp+body).digest("hex");
  return signatures.some(sig=>{try{return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(digest));}catch{return false;}});
}
async function cinetpayConfirmed(reference, payment) {
  const response=await fetch("https://api-checkout.cinetpay.com/v2/payment/check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apikey:process.env.CINETPAY_API_KEY,site_id:process.env.CINETPAY_SITE_ID,transaction_id:reference})});
  const result=await response.json().catch(()=>({}));
  return response.ok&&result.data?.status==="ACCEPTED"&&result.data?.currency==="XOF"&&Number(result.data?.amount)===Number(payment.amount_xof);
}
module.exports = async function handler(req,res) {
  if(req.method==="GET")return res.status(200).send("Kori payment callback ready");
  if(req.method!=="POST")return res.status(405).end();
  try {
    const body=await rawBody(req); const signature=req.headers["wave-signature"];
    if(signature){
      if(!waveValid(signature,body,process.env.WAVE_WEBHOOK_SECRET))return res.status(401).end();
      const event=JSON.parse(body); if(event.type!=="checkout.session.completed"||event.data?.payment_status!=="succeeded")return res.status(200).end();
      const reference=event.data.client_reference; const payment=await pendingPayment(reference);
      if(payment&&payment.status==="pending"&&payment.provider==="wave"&&Number(event.data.amount)===PLAN_AMOUNT_XOF&&event.data.currency==="XOF")await activateSubscription(payment);
      return res.status(200).end();
    }
    let event;try{event=JSON.parse(body);}catch{event=Object.fromEntries(new URLSearchParams(body));}
    const reference=String(event.cpm_trans_id||event.transaction_id||"");
    const payment=await pendingPayment(reference);
    if(payment&&payment.status==="pending"&&payment.provider==="cinetpay"&&await cinetpayConfirmed(reference,payment))await activateSubscription(payment);
    return res.status(200).end();
  } catch { return res.status(500).end(); }
};
