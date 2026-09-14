function applicationEndpoint(){
 const emulator='http://127.0.0.1:5001/demo-alpine-shine/australia-southeast1/submitApplication';
 if(location.origin==='http://127.0.0.1:5516'&&window.ALPINE_APPLICATION_EMULATOR_URL===emulator)return emulator;
 return 'https://australia-southeast1-alpine-shine-website.cloudfunctions.net/submitApplication';
}
async function sendApplicationRequest(form,status){
 const button=form.querySelector('button[type="submit"]');if(button.disabled||!form.reportValidity())return;
 const file=form.elements.namedItem('cv').files[0];
 if(file&&(!/\.(pdf|doc|docx)$/i.test(file.name)||file.size>5*1024*1024||file.size===0)){status.textContent='Please choose a PDF, DOC or DOCX CV of up to 5MB.';status.hidden=false;return}
 const body=new FormData(form);if(!file)body.delete('cv');
 button.disabled=true;status.hidden=false;status.textContent='Sending your application…';
 const fallback='Your application could not be confirmed. Your details and selected CV are still here. Please try again or contact Alpine Shine.';
 try{
  // Let the browser supply the multipart boundary; no direct Storage or Firestore access.
  const response=await fetch(applicationEndpoint(),{method:'POST',body});const result=await response.json().catch(()=>null);
  if(response.status!==200||result?.ok!==true){status.textContent=({400:'Please check the required fields and your CV file. Your details and selected CV are still here.',413:'Please choose a CV of up to 5MB and shorten long answers. Your details are still here.',429:'Too many attempts. Please try again later. Your details and selected CV are still here.'})[response.status]||fallback;return}
  form.reset();form.querySelector('select[name]')?.dispatchEvent(new Event('change',{bubbles:true}));status.textContent='Thank you. Your application has been received.';
 }catch(_){status.textContent=fallback}finally{button.disabled=false}
}

// Own this form submission before the shared legacy handler is registered.
// This keeps publication isolated to the Work With Us page and its script.
document.querySelectorAll(".application-form").forEach((form) => {
 form.addEventListener("submit", (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  const status = form.querySelector(".form-status");
  if (status) sendApplicationRequest(form, status);
 });
});
