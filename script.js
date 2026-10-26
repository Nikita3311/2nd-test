"use strict";
const $=id=>document.getElementById(id);
const state={ipv4:null,ipv6:null,geo:null,geoIp:null,map:null,marker:null,run:0};
const TIMEOUT=8000;
function set(id,value){$(id).textContent=value??"—"}
function safe(value,fallback="Unavailable"){return value===null||value===undefined||value===""?fallback:String(value)}
async function getJSON(url,timeout=TIMEOUT){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{signal:controller.signal,cache:"no-store"});if(!response.ok)throw new Error(response.status===429?"Rate limit reached":`HTTP ${response.status}`);return await response.json()}finally{clearTimeout(timer)}}
function isIPv4(ip){if(typeof ip!=="string")return false;const parts=ip.split(".");return parts.length===4&&parts.every(p=>/^\d{1,3}$/.test(p)&&Number(p)<=255)}
function isIPv6(ip){return typeof ip==="string"&&ip.includes(":")&&/^[a-fA-F0-9:.]+$/.test(ip)}
async function detect(url,validate){const data=await getJSON(url,7000);if(!validate(data.ip))throw new Error("Unexpected address family");return data.ip}
async function firstValid(attempts,validate){const outcomes=await Promise.allSettled(attempts.map(async ([url,extract])=>{const data=await getJSON(url,7500);const ip=extract(data);if(!validate(ip))throw new Error("Unexpected IP response");return ip}));const found=outcomes.find(r=>r.status==="fulfilled");if(found)return found.value;throw new Error("All IP lookup services unavailable")}
const ipv4Sources=[["https://api.ipify.org?format=json",d=>d.ip],["https://api4.ipify.org?format=json",d=>d.ip],["https://api.ip.sb/geoip",d=>d.ip]];
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2400)}
function renderAddresses(results){state.ipv4=results[0].status==="fulfilled"?results[0].value:null;state.ipv6=results[1].status==="fulfilled"?results[1].value:null;set("ipv4",state.ipv4||"Not detected");set("ipv6",state.ipv6||"Not detected");set("ipv4Note",state.ipv4?"IPv4 reachable":"Unavailable or request blocked");set("ipv6Note",state.ipv6?"IPv6 reachable":"Unavailable or request blocked");const main=state.ipv4||state.ipv6;set("mainIp",main||"IP unavailable");set("heroHint",main?"Public address seen by the lookup endpoint":"Could not reach IP lookup services");$("copyBtn").disabled=!main;set("heroStatus",main?"● CONNECTED":"● UNAVAILABLE");$("heroStatus").style.color=main?"":"#f8b96a"}
function privacy(){const network=state.geo?.connection||{};const isp=(safe(network.isp,"")+" "+safe(network.org,"")).toLowerCase();const knownHosting=/\b(amazon|aws|google cloud|microsoft azure|digitalocean|hetzner|ovh|linode|vultr|contabo|cloudflare|oracle cloud)\b/i.test(isp);set("hostingStatus",knownHosting?"Possible hosting provider":"Unable to determine");$("hostingDot").className="indicator "+(knownHosting?"warn":"neutral");set("vpnStatus",knownHosting?"Possible infrastructure indicator":"Unable to determine");$("vpnDot").className="indicator "+(knownHosting?"warn":"neutral");set("leakStatus",state.ipv6?"IPv6 publicly reachable":"IPv6 not detected");$("leakDot").className="indicator "+(state.ipv6?"warn":"neutral");set("privacyTitle",knownHosting?"Infrastructure indicators found":"Privacy status inconclusive");set("privacySummary",knownHosting?"The network name resembles a known hosting provider. This does not confirm VPN or proxy usage.":"Public IP data alone cannot reliably determine whether a VPN or proxy is active.");set("privacyBadge",knownHosting?"VPN/PROXY SUSPECTED":"UNABLE TO DETERMINE")}
function flagEmoji(code){if(!/^[A-Z]{2}$/.test(code||""))return "◎";return [...code].map(c=>String.fromCodePoint(127397+c.charCodeAt(0))).join("")}
function renderGeo(g){state.geo=g;const c=g.connection||{};set("isp",safe(c.isp));set("org",safe(c.org));set("asn",safe(c.asn));set("networkType","Network type: not independently verified");set("flag",flagEmoji(g.country_code));set("city",safe(g.city,"Location unavailable"));set("country",[g.country,g.country_code].filter(Boolean).join(" · ")||"Unknown country");set("region",safe(g.region));set("timezone",safe(g.timezone?.id));const lat=Number(g.latitude),lon=Number(g.longitude);const valid=Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;set("coords",valid?`${lat.toFixed(3)}, ${lon.toFixed(3)}`:"Unavailable");if(valid){renderTileMap(lat,lon)}else{$("map").innerHTML='<div class="map-placeholder">Location coordinates unavailable</div>'; $("mapExternal").hidden=true};privacy()}
function renderTileMap(lat,lon){
 const zoom=8,tileSize=256,scale=Math.pow(2,zoom);
 const x=(lon+180)/360*scale;
 const sin=Math.sin(lat*Math.PI/180);
 const y=(1-Math.log((1+sin)/(1-sin))/(2*Math.PI))/2*scale;
 const wrap=$("map");wrap.replaceChildren();
 const stage=document.createElement("div");stage.className="tile-stage";wrap.append(stage);
 const marker=document.createElement("div");marker.className="map-pin";marker.setAttribute("aria-label","Approximate IP location");wrap.append(marker);
 const status=document.createElement("div");status.className="map-tile-error";status.textContent="Map tiles unavailable. Open full map instead.";status.hidden=true;wrap.append(status);
 const link=$("mapExternal");link.href="https://www.openstreetmap.org/?mlat="+encodeURIComponent(lat)+"&mlon="+encodeURIComponent(lon)+"#map="+zoom+"/"+lat+"/"+lon;link.hidden=false;
 let loaded=0,failed=0;
 function paint(){
  stage.replaceChildren();loaded=0;failed=0;status.hidden=true;
  const w=wrap.clientWidth||340,h=wrap.clientHeight||320;
  const centerX=w/2,centerY=h/2;
  const baseX=Math.floor(x),baseY=Math.floor(y);
  const countX=Math.ceil(w/256/2)+1,countY=Math.ceil(h/256/2)+1;
  for(let dy=-countY;dy<=countY;dy++)for(let dx=-countX;dx<=countX;dx++){
   const tx=baseX+dx,ty=baseY+dy;if(ty<0||ty>=scale)continue;
   const img=document.createElement("img");img.alt="";img.decoding="async";img.className="map-tile";
   img.style.left=(centerX+(tx-x)*tileSize)+"px";img.style.top=(centerY+(ty-y)*tileSize)+"px";
   img.onload=()=>{loaded++;status.hidden=true};img.onerror=()=>{failed++;if(loaded===0&&failed>=3)status.hidden=false};
   img.src="https://basemaps.cartocdn.com/dark_all/"+zoom+"/"+((tx%scale+scale)%scale)+"/"+ty+".png";
   stage.append(img);
  }
 }
 paint();
 if(state.mapObserver)state.mapObserver.disconnect();
 if(typeof ResizeObserver!=="undefined"){state.mapObserver=new ResizeObserver(()=>{const width=wrap.clientWidth;if(width&&width!==state.mapWidth){state.mapWidth=width;paint()}});state.mapWidth=wrap.clientWidth;state.mapObserver.observe(wrap)}
}
function resetGeo(){state.geo=null;["isp","org","asn","region","timezone","coords"].forEach(id=>set(id,"—"));set("city","Location unavailable");set("country","Geolocation unavailable");set("flag","◎");set("networkType","Network type: unavailable");privacy()}
async function refresh(){const run=++state.run;$("refreshBtn").disabled=true;set("mainIp","Detecting your IP…");set("heroStatus","● CHECKING");set("heroHint","Checking IPv4 and IPv6 independently");["ipv4","ipv6","isp","asn"].forEach(id=>set(id,"Checking…"));const results=await Promise.allSettled([firstValid(ipv4Sources,isIPv4),firstValid([["https://api6.ipify.org?format=json",d=>d.ip],["https://api64.ipify.org?format=json",d=>d.ip]],isIPv6)]);if(run!==state.run)return;renderAddresses(results);privacy();const ip=state.ipv4||state.ipv6;if(ip){try{const geo=await getJSON("https://ipwho.is/"+encodeURIComponent(ip));if(run!==state.run)return;if(geo.success===false)throw new Error(geo.message||"Lookup unavailable");state.geoIp=ip;renderGeo(geo)}catch(e){if(run!==state.run)return;resetGeo();toast("Location lookup unavailable — IP detection still works")}}else{resetGeo();try{const geo=await getJSON("https://ipwho.is/");if(run===state.run&&geo.success!==false){if(isIPv4(geo.ip)){state.ipv4=geo.ip;set("ipv4",geo.ip)}else if(isIPv6(geo.ip)){state.ipv6=geo.ip;set("ipv6",geo.ip)}const main=state.ipv4||state.ipv6;if(main){set("mainIp",main);set("heroStatus","● CONNECTED");set("heroHint","Public IP detected via geolocation fallback");$("copyBtn").disabled=false}renderGeo(geo)}}catch(e){console.warn("Fallback geolocation failed",e)}}$("refreshBtn").disabled=false}
function device(){const ua=navigator.userAgent;let browser="Other browser";if(/Edg\//.test(ua))browser="Microsoft Edge";else if(/Firefox\//.test(ua))browser="Firefox";else if(/CriOS|Chrome\//.test(ua))browser="Chrome";else if(/Safari\//.test(ua))browser="Safari";let os="Unknown";if(/iPhone|iPad|iPod/.test(ua))os="iOS / iPadOS";else if(/Android/.test(ua))os="Android";else if(/Windows/.test(ua))os="Windows";else if(/Mac OS X/.test(ua))os="macOS";else if(/Linux/.test(ua))os="Linux";set("browser",browser);set("os",os);set("language",navigator.language||"Unknown");set("screen",screen.width+" × "+screen.height);set("https",location.protocol==="https:"?"HTTPS secure":location.protocol==="file:"?"Local file":"Not HTTPS")}
$("refreshBtn").addEventListener("click",refresh);$("copyBtn").addEventListener("click",async()=>{const ip=state.ipv4||state.ipv6;if(!ip)return;try{await navigator.clipboard.writeText(ip);toast("IP address copied")}catch{toast("Clipboard unavailable — select and copy the address")}});
$("themeBtn").addEventListener("click",()=>{const light=document.body.classList.toggle("light");$("themeBtn").textContent=light?"☀":"☾";$("themeBtn").setAttribute("aria-label",light?"Switch to dark theme":"Switch to light theme")});
device();refresh();