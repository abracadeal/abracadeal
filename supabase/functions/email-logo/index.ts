import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const KEY="abracadeal-email-logo-20260920";
const B64="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";
function decodeBase64(base64:string){
  const bin=atob(base64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return bytes;
}
const image=decodeBase64(B64);
Deno.serve((req:Request)=>{
  const url=new URL(req.url);
  if(url.searchParams.get("k")!==KEY) return new Response("Not found",{status:404});
  return new Response(image,{headers:{
    "Content-Type":"image/webp",
    "Content-Length":String(image.length),
    "Cache-Control":"public, max-age=31536000, immutable",
    "X-Content-Type-Options":"nosniff"
  }});
});