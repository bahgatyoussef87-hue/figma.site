const API_BASE = localStorage.getItem("reviewApiBase") || "";
const icons = {dashboard:"⌂", analyze:"✦", previous:"☷", stats:"◔", performance:"▥", about:"ⓘ"};
const navItems = [
  ["dashboard","Dashboard"],["analyze","Analyze Review"],["previous","Previous Reviews"],
  ["stats","Review Statistics"],["performance","Model Performance"],["about","About System"]
];

const sourceStats = {
  total: 1462, positive: 1109, neutral: 347, negative: 6,
  models: {
    "Logistic Regression": {accuracy:.777, precision:.7827, recall:.777, f1:.7038, source:"derived weighted metrics from the notebook's 3-class confusion matrix"},
    "KNN": {accuracy:.7482900137, precision:.7140, recall:.7482900137, f1:.7232993692, source:"notebook evaluation"},
    "SVM": {accuracy:.7838577291, precision:.7753, recall:.7838577291, f1:.7250920305, source:"derived weighted metrics from the notebook's 3-class confusion matrix"}
  }
};

let reviews = JSON.parse(localStorage.getItem("reviewHistory") || "[]");
let currentPage = "dashboard";
let lastResult = null;

function $(s){return document.querySelector(s)}
function esc(v){return String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function cls(s){return String(s||"").toLowerCase()}
function pct(n){return `${(Number(n)*100).toFixed(1)}%`}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function saveReviews(){localStorage.setItem("reviewHistory",JSON.stringify(reviews))}
function nav(){ $("#nav").innerHTML=`<div class="nav-group">${navItems.map(([id,label])=>`<button class="nav-item ${id===currentPage?"active":""}" onclick="go('${id}')"><span class="nav-icon">${icons[id]}</span><span>${label}</span></button>`).join("")}</div>`}
function go(page){currentPage=page;nav();$("#pageTitle").textContent=navItems.find(x=>x[0]===page)[1];render()}

function donut(a,b,c){
  const total=a+b+c||1, p=a/total*100, n=b/total*100, g=c/total*100;
  return `<div class="chart-wrap"><div class="donut" style="background:conic-gradient(var(--positive) 0 ${p}%,var(--neutral) ${p}% ${p+n}%,var(--negative) ${p+n}% 100%)"><div class="donut-center"><strong>${total}</strong><span>reviews</span></div></div><div class="legend">
    <div class="legend-row"><i class="legend-dot" style="background:var(--positive)"></i><span>Positive</span><strong>${a} · ${p.toFixed(1)}%</strong></div>
    <div class="legend-row"><i class="legend-dot" style="background:var(--neutral)"></i><span>Neutral</span><strong>${b} · ${n.toFixed(1)}%</strong></div>
    <div class="legend-row"><i class="legend-dot" style="background:var(--negative)"></i><span>Negative</span><strong>${c} · ${g.toFixed(1)}%</strong></div>
  </div></div>`
}

function dashboard(){
  const avg = sourceStats.models["SVM"].accuracy;
  return `<div class="grid kpi-grid">
    ${kpi("Total Reviews Analyzed",sourceStats.total,"Dataset after preprocessing","▤")}
    ${kpi("Positive Reviews",sourceStats.positive,pct(sourceStats.positive/sourceStats.total)+" of dataset","↑")}
    ${kpi("Neutral Reviews",sourceStats.neutral,pct(sourceStats.neutral/sourceStats.total)+" of dataset","•")}
    ${kpi("Negative Reviews",sourceStats.negative,pct(sourceStats.negative/sourceStats.total)+" of dataset","↓")}
    ${kpi("Model Accuracy",pct(avg),"SVM · notebook evaluation","◎")}
  </div>
  <div class="grid two-col">
    <div class="card"><div class="section-head"><h3>Sentiment Distribution</h3><span>Source dataset · 1,462 usable reviews</span></div>${donut(sourceStats.positive,sourceStats.neutral,sourceStats.negative)}</div>
    <div class="card"><div class="section-head"><h3>Model Snapshot</h3><span>Test-set metrics</span></div>
      <div class="bar-chart">${Object.entries(sourceStats.models).map(([m,v])=>`<div class="bar-row"><span>${m}</span><div class="bar-track"><div class="bar-fill" style="width:${v.accuracy*100}%"></div></div><strong>${pct(v.accuracy)}</strong></div>`).join("")}</div>
      <p class="hint">Values shown here come from the uploaded notebooks; they are not fabricated demo scores.</p>
    </div>
  </div>
  <div class="card recent"><div class="section-head"><h3>Recent Reviews</h3><span>${reviews.length ? "Saved in this browser" : "Demo examples · replace with API results"}</span></div>
    ${recentRows()}</div>`;
}
function kpi(label,value,meta,icon){return `<div class="card kpi"><div class="kpi-icon">${icon}</div><div class="label">${label}</div><div class="value">${value}</div><div class="meta">${meta}</div></div>`}
function recentRows(){
  const data = reviews.length ? reviews.slice(0,5) : [
    {review:"Looks durable and charging is fine. Good value for money.",sentiment:"Positive",confidence:.92,model:"Logistic Regression",date:"Demo"},
    {review:"Works as expected, but the cable could be a little longer.",sentiment:"Neutral",confidence:.71,model:"SVM",date:"Demo"},
    {review:"Stopped working after a few days and feels cheaply made.",sentiment:"Negative",confidence:.88,model:"KNN",date:"Demo"}
  ];
  return data.map(r=>`<div class="review-row" onclick='showReview(${JSON.stringify(r).replace(/'/g,"&#39;")})'><div><div class="review-text">${esc(r.review)}</div><div class="review-meta">${esc(r.date)} · ${esc(r.model)}</div></div><span class="pill ${cls(r.sentiment)}">${esc(r.sentiment)} · ${pct(r.confidence)}</span></div>`).join("");
}

function analyze(){
 return `<div class="workflow">${["Enter Review","Select Model","Analyze","Show Sentiment","Show Confidence","Save Result","Update Statistics"].map((x,i)=>`<div class="step"><b>${i+1}. ${x}</b><span>${i===0?"Input":i===1?"Choice":i===2?"Inference":"Result"}</span></div>`).join("")}</div>
 <div class="analyze-layout">
  <div class="card">
   <div class="section-head"><h3>Analyze Amazon Customer Review</h3><span>TF-IDF → classifier</span></div>
   <label class="label">Enter Amazon Customer Review</label>
   <textarea id="reviewInput" class="textarea" placeholder="Write or paste a customer review here..."></textarea>
   <div class="controls"><div><label class="label">Selected Model</label><select id="modelSelect" class="select"><option>Logistic Regression</option><option>SVM</option><option>KNN</option></select></div><div><label class="label">Processing</label><div class="select" style="color:#159a68;background:#f4fbf8">TF-IDF · 10,000 max features</div></div></div>
   <label class="check"><input type="checkbox" id="compareModels"> Compare Models — return predictions from all three classifiers</label>
   <div style="margin-top:16px;display:flex;gap:10px;align-items:center"><button class="primary" id="analyzeBtn" onclick="runAnalysis()">Analyze Review</button><span id="analyzeHint" class="hint">Backend endpoint: POST /api/analyze</span></div>
  </div>
  <div class="card result-card" id="resultPanel"><div class="section-head"><h3>Prediction Result</h3><span id="resultTime">Awaiting review</span></div><div class="result-empty"><div><div class="big-icon">✦</div><strong>Ready to analyze</strong><p class="hint">Your sentiment, confidence, model and prediction time will appear here.</p></div></div></div>
 </div>`;
}

async function runAnalysis(){
 const text=$("#reviewInput").value.trim(); if(!text){toast("Enter a review first.");return}
 const btn=$("#analyzeBtn");btn.disabled=true;btn.textContent="Analyzing…";const started=performance.now();
 let result;
 try{
   const res=await fetch(`${API_BASE}/api/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({review:text,model:$("#modelSelect").value,compare_models:$("#compareModels").checked})});
   if(!res.ok) throw new Error("API unavailable"); result=await res.json(); $("#backendStatus").textContent="Python API connected";
 }catch(e){
   result=demoPredict(text,$("#modelSelect").value,$("#compareModels").checked);$("#backendStatus").textContent="Demo mode";toast("API unavailable — showing demo prediction.");
 }
 result.prediction_time_ms=result.prediction_time_ms ?? Math.max(18,Math.round(performance.now()-started));
 lastResult=result; renderResult(result,text);
 btn.disabled=false;btn.textContent="Analyze Review";
}

function demoPredict(text,model,compare){
 const t=text.toLowerCase();let sentiment="Neutral",confidence=.68;
 const pos=["good","great","excellent","love","fast","durable","happy","amazing","worth","perfect","satisfied","recommend"];
 const neg=["bad","poor","broken","waste","slow","terrible","stopped","disappointed","cheap","worst","refund","issue"];
 const ps=pos.reduce((n,w)=>n+(t.includes(w)?1:0),0), ns=neg.reduce((n,w)=>n+(t.includes(w)?1:0),0);
 if(ps>ns){sentiment="Positive";confidence=Math.min(.96,.72+ps*.04)} else if(ns>ps){sentiment="Negative";confidence=Math.min(.96,.72+ns*.04)}
 const models={};["Logistic Regression","SVM","KNN"].forEach(m=>models[m]={sentiment,confidence:Math.max(.55,confidence-(m===model?0:.06)),model:m});
 return {sentiment,confidence,model,tfidf_status:"processed",prediction_time_ms:0,models:compare?models:null,demo:true};
}
function renderResult(r,text){
 const p=$("#resultPanel"), c=cls(r.sentiment);
 let comparison=r.models?`<div class="card" style="padding:0;box-shadow:none;margin-top:16px"><div class="section-head" style="padding:0 0 10px"><h3>Model Comparison</h3><span>Same review</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Model</th><th>Sentiment</th><th>Confidence</th></tr></thead><tbody>${Object.values(r.models).map(x=>`<tr><td>${esc(x.model)}</td><td><span class="pill ${cls(x.sentiment)}">${esc(x.sentiment)}</span></td><td>${pct(x.confidence)}</td></tr>`).join("")}</tbody></table></div></div>`:"";
 p.innerHTML=`<div class="section-head"><h3>Prediction Result</h3><span>${r.prediction_time_ms} ms</span></div>
 <div class="sentiment-hero ${c}"><small>PREDICTED SENTIMENT</small><h2>${esc(r.sentiment)}</h2></div>
 <div class="metric-list"><div class="metric"><span>Confidence Score</span><strong>${pct(r.confidence)}</strong></div><div class="confidence"><i style="width:${r.confidence*100}%"></i></div>
 <div class="metric"><span>Selected Model</span><strong>${esc(r.model)}</strong></div><div class="metric"><span>TF-IDF Processing</span><strong style="color:var(--positive)">✓ ${esc(r.tfidf_status||"processed")}</strong></div><div class="metric"><span>Prediction Time</span><strong>${r.prediction_time_ms} ms</strong></div></div>
 <button class="primary" style="margin-top:17px" onclick="saveResult()">Save Result</button>${comparison}`;
}
function saveResult(){
 if(!lastResult)return;const text=$("#reviewInput").value.trim();
 reviews.unshift({review:text,sentiment:lastResult.sentiment,confidence:lastResult.confidence,model:lastResult.model,date:new Date().toLocaleString()});
 reviews=reviews.slice(0,100);saveReviews();toast("Result saved. Statistics updated.");go("previous");
}
function previous(){
 return `<div class="card"><div class="toolbar"><input id="searchInput" class="search" placeholder="Search reviews..." oninput="drawTable()"><select id="sentimentFilter" class="filter" onchange="drawTable()"><option>All sentiments</option><option>Positive</option><option>Neutral</option><option>Negative</option></select><select id="sortSelect" class="filter" onchange="drawTable()"><option value="new">Newest first</option><option value="confidence">Confidence</option></select></div><div id="reviewTable"></div></div>`;
}
function drawTable(){
 let data=[...reviews];const q=($("#searchInput")?.value||"").toLowerCase(), f=$("#sentimentFilter")?.value||"All sentiments", s=$("#sortSelect")?.value||"new";
 if(!data.length)data=[{review:"No saved reviews yet. Analyze a review to populate this table.",sentiment:"—",confidence:null,model:"—",date:"—"}];
 else {data=data.filter(r=>(!q||r.review.toLowerCase().includes(q))&&(f==="All sentiments"||r.sentiment===f));if(s==="confidence")data.sort((a,b)=>b.confidence-a.confidence)}
 $("#reviewTable").innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Review</th><th>Sentiment</th><th>Confidence</th><th>Model</th><th>Date</th></tr></thead><tbody>${data.slice(0,10).map(r=>`<tr onclick='showReview(${JSON.stringify(r).replace(/'/g,"&#39;")})'><td class="review-cell">${esc(r.review)}</td><td>${r.sentiment==="—"?"—":`<span class="pill ${cls(r.sentiment)}">${esc(r.sentiment)}</span>`}</td><td>${r.confidence==null?"—":pct(r.confidence)}</td><td>${esc(r.model)}</td><td>${esc(r.date)}</td></tr>`).join("")}</tbody></table></div><div class="hint" style="margin-top:12px">Showing up to 10 rows per page · pagination hook is ready for a server-backed dataset.</div>`;
}
function stats(){
 const total=reviews.length||sourceStats.total, p=reviews.length?reviews.filter(r=>r.sentiment==="Positive").length:sourceStats.positive, n=reviews.length?reviews.filter(r=>r.sentiment==="Neutral").length:sourceStats.neutral, g=reviews.length?reviews.filter(r=>r.sentiment==="Negative").length:sourceStats.negative;
 return `<div class="grid kpi-grid" style="grid-template-columns:repeat(4,1fr)">${kpi("Reviews",total,reviews.length?"Saved browser results":"Dataset demo","▤")}${kpi("Positive",p,pct(p/total),"↑")}${kpi("Neutral",n,pct(n/total),"•")}${kpi("Negative",g,pct(g/total),"↓")}</div>
 <div class="grid two-col"><div class="card"><div class="section-head"><h3>Sentiment Percentage</h3><span>${reviews.length?"Saved results":"Dataset demo"}</span></div>${donut(p,n,g)}</div><div class="card"><div class="section-head"><h3>Model Prediction Distribution</h3><span>Saved results</span></div>${modelDistribution()}</div></div>`;
}
function modelDistribution(){
 const counts={};reviews.forEach(r=>counts[r.model]=(counts[r.model]||0)+1);
 if(!Object.keys(counts).length)return `<div class="result-empty" style="min-height:230px"><div><strong>No saved predictions yet</strong><p class="hint">Use Analyze Review → Save Result.</p></div></div>`;
 return `<div class="bar-chart" style="padding-top:15px">${Object.entries(counts).map(([m,c])=>`<div class="bar-row"><span>${esc(m)}</span><div class="bar-track"><div class="bar-fill" style="width:${c/reviews.length*100}%"></div></div><strong>${c}</strong></div>`).join("")}</div>`;
}
function performance(){
 return `<div class="grid compare-grid"><div class="card"><div class="section-head"><h3>Model Accuracy</h3><span>Notebook evaluation</span></div><div class="bar-chart">${Object.entries(sourceStats.models).map(([m,v])=>`<div class="bar-row"><span>${m}</span><div class="bar-track"><div class="bar-fill" style="width:${v.accuracy*100}%"></div></div><strong>${pct(v.accuracy)}</strong></div>`).join("")}</div></div><div class="card"><div class="section-head"><h3>Evaluation Metrics</h3><span>Weighted</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead><tbody>${Object.entries(sourceStats.models).map(([m,v])=>`<tr><td><strong>${m}</strong></td><td>${pct(v.accuracy)}</td><td>${pct(v.precision)}</td><td>${pct(v.recall)}</td><td>${pct(v.f1)}</td></tr>`).join("")}</tbody></table></div><p class="hint">KNN metrics are directly reported in the notebook. Logistic Regression and SVM precision/recall/F1 shown here are weighted values calculated from their notebook confusion matrices. Re-run the evaluation in your backend if you want the API to be the sole source of truth.</p></div></div>`;
}
function about(){
 return `<div class="grid compare-grid"><div class="card"><div class="section-head"><h3>System Architecture</h3><span>Production-ready separation</span></div><p class="info"><strong>Browser UI</strong> collects a review and model choice → <strong>Python API</strong> cleans text and applies the trained TF-IDF vectorizer → <strong>classifier</strong> predicts sentiment → JSON response updates the result card → saved result updates local statistics.</p><div class="code-box">POST /api/analyze
{
  "review": "Great product and fast delivery",
  "model": "Logistic Regression",
  "compare_models": false
}

→
{
  "sentiment": "Positive",
  "confidence": 0.92,
  "model": "Logistic Regression"
}</div></div><div class="card"><div class="section-head"><h3>Notebook Alignment</h3><span>Uploaded project files</span></div><p class="info">The supplied notebooks use a three-class sentiment definition based on rating: <strong>0 = Negative (&lt;3)</strong>, <strong>1 = Neutral (3–3.9)</strong>, <strong>2 = Positive (≥4)</strong>. The Logistic Regression notebook uses TF-IDF with up to 10,000 features and English stop-word removal, then evaluates Logistic Regression, KNN and linear SVM.</p><p class="hint">The Random Forest notebook is a different task: it predicts “High Product” (rating ≥4) vs “Not High Product”, so it is intentionally not presented as a sentiment model in this dashboard.</p></div></div>`;
}
function render(){
 const page=$("#page"); if(currentPage==="dashboard")page.innerHTML=dashboard(); else if(currentPage==="analyze")page.innerHTML=analyze(); else if(currentPage==="previous"){page.innerHTML=previous();drawTable()} else if(currentPage==="stats")page.innerHTML=stats(); else if(currentPage==="performance")page.innerHTML=performance(); else page.innerHTML=about();
}
function showReview(r){$("#modalBody").innerHTML=`<div class="eyebrow">FULL ANALYSIS</div><h2 style="margin:5px 0 18px">${esc(r.sentiment)} Review</h2><p class="info">${esc(r.review)}</p><div class="metric-list" style="margin-top:15px"><div class="metric"><span>Confidence</span><strong>${r.confidence==null?"—":pct(r.confidence)}</strong></div><div class="metric"><span>Model</span><strong>${esc(r.model)}</strong></div><div class="metric"><span>Date</span><strong>${esc(r.date)}</strong></div></div>`;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
$("#refreshBtn").onclick=()=>{render();toast("Dashboard refreshed.")}
nav();render();