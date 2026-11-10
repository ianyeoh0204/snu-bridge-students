import fs from 'node:fs';
import {prepareGeneration,activeCloudRun} from '../lib/pipeline/queue.mjs';
import {verifyGateway} from '../lib/pipeline/baze.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const policy=read('data/generation-policy.json'),ledger=read('data/generation-ledger.json'),queue=read('data/generation-queue.json');
const keyAvailable=Boolean(process.env.BAZE_API);
const runID=process.env.GITHUB_ACTIONS?activeCloudRun():('offline-'+Date.now());
if(keyAvailable&&!process.env.GITHUB_ACTIONS)throw Error('Use the cloud workflow for paid execution. Offline checks do not need a key.');
let gatewayError=null;
if(keyAvailable&&policy.enabled){try{const checked=await verifyGateway(process.env.BAZE_API);fs.writeFileSync('data/gateway-model.json',JSON.stringify(checked,null,2)+'\n');}catch(e){gatewayError=e.message;}}
const plan=gatewayError?{schema_version:1,budget_id:policy.budget_id,run_id:runID,status:'provider_needs_attention',tasks:[],error:gatewayError}:prepareGeneration({notices:read('data/notices.json'),briefs:read('data/briefs.json'),queue,ledger,policy,runID,keyAvailable});
for(const [file,value] of [['generation-plan',plan],['generation-ledger',ledger],['generation-queue',queue]])fs.writeFileSync('data/'+file+'.json',JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({status:plan.status,notices:plan.tasks.length,reserved_usd:(plan.reserved_micros||0)/1e6,remaining_usd:plan.remaining_micros===undefined?null:plan.remaining_micros/1e6}));
