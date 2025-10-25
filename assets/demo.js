
// ===== Helpers =====
const store = (key, val) => localStorage.setItem(key, JSON.stringify(val));
const load  = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

async function copyToClipboard(text){
  try{ await navigator.clipboard.writeText(text); alert('Copied to clipboard'); }
  catch{ const ta = document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); alert('Copied'); }
}

function toCSV(rows, headers){
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const head = headers.map(esc).join(',');
  const body = rows.map(r => headers.map(h=>esc(r[h])).join(',')).join('\n');
  return head + '\n' + body;
}

function download(filename, text){
  const blob = new Blob([text], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// ===== Demo Data Seed =====
function seedDemoData(){
  if(localStorage.getItem('df_seeded')) return;
  const leads = [
    {name:"Ava Carter", email:"ava@carterco.io", source:"Instagram DM", tag:"Hot", ts:new Date().toISOString()},
    {name:"M. Patel", email:"mpatel@patelgroup.com", source:"Referral", tag:"Warm", ts:new Date().toISOString()},
    {name:"Jordan Lee", email:"jordan@leestudio.co", source:"Calendly", tag:"Hot", ts:new Date().toISOString()},
    {name:"Sophie Nguyen", email:"sophie@nguyen.co", source:"Website", tag:"Cold", ts:new Date().toISOString()}
  ];
  const deals = [
    {name:"Retainer — CarterCo", value:12000, pct:15, commission:1800, ts:new Date().toISOString()},
    {name:"Funnel — Patel Group", value:8500, pct:12, commission:1020, ts:new Date().toISOString()},
    {name:"Consult — Lee Studio", value:4500, pct:20, commission:900, ts:new Date().toISOString()}
  ];
  store('df_leads', leads);
  store('df_deals', deals);
  store('df_licenses', []);
  localStorage.setItem('df_reseller_id', 'R-DEMO88');
  localStorage.setItem('df_seeded', '1');
}

function resetDemoData(){
  ['df_leads','df_deals','df_licenses','df_reseller_id','df_seeded'].forEach(k=>localStorage.removeItem(k));
  alert('Demo data cleared. Reloading…');
  location.reload();
}

// ===== Leads =====
function addLead(e){
  e.preventDefault();
  const leads = load('df_leads');
  const lead = {
    name: document.getElementById('lead_name').value.trim(),
    email: document.getElementById('lead_email').value.trim(),
    source: document.getElementById('lead_source').value.trim(),
    tag: document.getElementById('lead_tag').value.trim(),
    ts: new Date().toISOString()
  };
  if(!lead.name || !lead.email) return alert('Name and email are required.');
  leads.push(lead); store('df_leads', leads);
  renderLeads(); e.target.reset();
}
function renderLeads(){
  const leads = load('df_leads');
  const tbody = document.getElementById('lead_rows'); if(!tbody) return;
  tbody.innerHTML = leads.map(l=>`<tr><td>${l.name}</td><td>${l.email}</td><td>${l.source}</td><td>${l.tag}</td><td>${new Date(l.ts).toLocaleString()}</td></tr>`).join('');
  const c = document.getElementById('lead_count'); if(c) c.textContent = leads.length;
}
function exportLeadsCSV(){
  const leads = load('df_leads');
  const csv = toCSV(leads, ['name','email','source','tag','ts']);
  download('dealflow_leads.csv', csv);
}

// ===== Proposals =====
function generateProposal(e){
  e.preventDefault();
  const client = document.getElementById('client').value;
  const scope  = document.getElementById('scope').value;
  const price  = document.getElementById('price').value;
  const terms  = document.getElementById('terms').value || "Net 7 terms. 50% deposit to start. Remaining due upon delivery.";
  const html = `
  <h2 style="margin:0">Proposal — ${client}</h2>
  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  <h3>Scope</h3><p>${scope.replace(/\n/g,'<br>')}</p>
  <h3>Investment</h3><p><strong>$${Number(price).toLocaleString()}</strong> one-time</p>
  <h3>Terms</h3><p>${terms}</p>
  <p style="margin-top:24px">Signed: ______________________</p>`;
  document.getElementById('proposal_preview').innerHTML = html;
}

// ===== Follow-up AI (template) =====
function generateFollowup(){
  const tone = document.getElementById('tone').value;
  const context = document.getElementById('context').value.trim();
  const base = {
    friendly: "Hey {name}, loved our chat! Based on {context}, I put together a quick next step. Would a 10-minute call tomorrow work?",
    firm: "Hi {name}, following up on {context}. Let's finalize by EOD. Here is the short summary and next step to sign off.",
    executive: "Hello {name}, per our discussion on {context}, this note summarizes outcomes and the single action to move forward."
  }[tone] || "Hi {name}, following up on {context}.";
  const name = document.getElementById('prospect').value || "there";
  const msg = base.replace("{name}", name).replace("{context}", context || "your project");
  document.getElementById('followup_result').value = msg;
}

// ===== Commission Tracker =====
function addDeal(e){
  e.preventDefault();
  const deals = load('df_deals');
  const value = parseFloat(document.getElementById('deal_value').value||0);
  const pct   = parseFloat(document.getElementById('commission_pct').value||0);
  const name  = document.getElementById('deal_name').value||"Deal";
  const commission = Math.round(value * pct)/100;
  deals.push({name,value,pct,commission,ts:new Date().toISOString()});
  store('df_deals', deals);
  renderDeals(); e.target.reset();
}
function renderDeals(){
  const deals = load('df_deals');
  const tbody = document.getElementById('deal_rows'); if(!tbody) return;
  let totalValue=0, totalComm=0;
  tbody.innerHTML = deals.map(d=>{
    totalValue+=d.value; totalComm+=d.commission;
    return `<tr><td>${d.name}</td><td>$${d.value.toLocaleString()}</td><td>${d.pct}%</td><td>$${d.commission.toLocaleString()}</td><td>${new Date(d.ts).toLocaleString()}</td></tr>`
  }).join('');
  const sv = document.getElementById('sum_value'); if(sv) sv.textContent = "$"+totalValue.toLocaleString();
  const sc = document.getElementById('sum_comm');  if(sc) sc.textContent  = "$"+totalComm.toLocaleString();
}
function exportDealsCSV(){
  const deals = load('df_deals');
  const csv = toCSV(deals, ['name','value','pct','commission','ts']);
  download('dealflow_deals.csv', csv);
}

// ===== Pipeline analytics =====
function computePipeline(){
  const leads = load('df_leads');
  const deals = load('df_deals');
  const totalLeads = leads.length;
  const totalDeals = deals.length;
  const totalValue = deals.reduce((s,d)=>s+(d.value||0),0);
  const totalCommission = deals.reduce((s,d)=>s+(d.commission||0),0);
  const winRate = totalLeads ? Math.round((totalDeals/totalLeads)*100) : 0;
  return { totalLeads, totalDeals, totalValue, totalCommission, winRate };
}
function renderPipeline(){
  const k = computePipeline();
  const el = (id,val)=>{ const n = document.getElementById(id); if(n) n.textContent = val; };
  el('pl_total_leads', k.totalLeads);
  el('pl_total_deals', k.totalDeals);
  el('pl_total_value', "$"+(k.totalValue||0).toLocaleString());
  el('pl_total_comm', "$"+(k.totalCommission||0).toLocaleString());
  el('pl_win_rate', k.winRate+"%");
  const stage1 = k.totalLeads;
  const stage2 = Math.round(stage1*0.6);
  const stage3 = k.totalDeals;
  const maxW = Math.max(stage1, stage2, stage3, 1);
  const bar = (id,val)=>{
    const n = document.getElementById(id);
    if(n){ n.style.width = (Math.max(val,1)/maxW*100)+"%"; n.querySelector('span').textContent = val; }
  };
  bar('f_stage1', stage1);
  bar('f_stage2', stage2);
  bar('f_stage3', stage3);
}

// ===== Reseller / referral (demo) =====
function getOrSetResellerId(){
  let rid = localStorage.getItem('df_reseller_id');
  if(!rid){
    rid = 'R-' + Math.random().toString(36).slice(2,8).toUpperCase();
    localStorage.setItem('df_reseller_id', rid);
  }
  return rid;
}
function setResellerId(rid){
  if(!rid) return;
  localStorage.setItem('df_reseller_id', rid.toUpperCase());
  renderReseller();
}
function generateLicense(){
  const keys = load('df_licenses');
  const key = 'LIC-' + Math.random().toString(36).slice(2,10).toUpperCase();
  const row = { key, active: true, ts: new Date().toISOString() };
  keys.push(row); store('df_licenses', keys);
  renderLicenses();
}
function toggleLicense(i){
  const keys = load('df_licenses');
  if(keys[i]){ keys[i].active = !keys[i].active; store('df_licenses', keys); renderLicenses(); }
}
function copyLicense(i){
  const keys = load('df_licenses');
  if(keys[i]) copyToClipboard(keys[i].key);
}
function renderLicenses(){
  const keys = load('df_licenses');
  const tbody = document.getElementById('lic_rows'); if(!tbody) return;
  tbody.innerHTML = keys.map((k,i)=>`<tr>
    <td>${k.key}</td>
    <td>${k.active ? 'Active' : 'Inactive'}</td>
    <td>${new Date(k.ts).toLocaleString()}</td>
    <td class="row"><button class="btn" onclick="toggleLicense(${i})">${k.active?'Disable':'Enable'}</button><button class="btn" onclick="copyLicense(${i})">Copy</button></td>
  </tr>`).join('');
  const count = document.getElementById('lic_count'); if(count) count.textContent = keys.length;
}
function renderReseller(){
  const rid = localStorage.getItem('df_reseller_id') || '';
  const idEl = document.getElementById('reseller_id'); if(idEl) idEl.value = rid;
  const base = (location.origin + location.pathname).replace(/demo\/resale-layer\.html$/,'');
  const ref = base + '?ref=' + encodeURIComponent(rid || 'R-XXXXXX');
  const out = document.getElementById('ref_link'); if(out) out.value = ref;
}

// Auto-render + seed on first visit
document.addEventListener('DOMContentLoaded', ()=>{
  seedDemoData();
  renderLeads();
  renderDeals();
  if(document.getElementById('pl_total_leads')) renderPipeline();
  if(document.getElementById('lic_rows')) { renderLicenses(); renderReseller(); }
});
