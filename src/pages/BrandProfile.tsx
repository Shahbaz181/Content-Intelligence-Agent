import {useEffect,useState} from "react";
import {getBrand,saveBrand} from "../api";
import {mockBrand} from "../mocks/data";
import {Page,Card,State} from "../components/UI";
import type {Brand} from "../types";
import {useAppStore} from "../store/useAppStore";

type BrandField=Exclude<keyof Brand,"synthetic">;
const fields: BrandField[]=["name","industry","tone","audience","platforms","goals","competitors","avoid"];
export default function BrandProfile(){
  const [b,setB]=useState(mockBrand),[loading,setL]=useState(false),[saving,setS]=useState(false),[msg,setM]=useState(""),[error,setError]=useState("");
  const setBrand=useAppStore(s=>s.setBrand);
  useEffect(()=>{setL(true);getBrand().then(x=>{setB(x);setBrand(x)}).catch(()=>setError("Backend unavailable — editing the seeded demo brand.")).finally(()=>setL(false));},[setBrand]);
  const update=(k:keyof Brand,v:string)=>setB({...b,[k]:v});
  const save=async()=>{setS(true);setM("");setError("");try{const x=await saveBrand(b);setB(x||b);setBrand(x||b);setM("Brand saved by the API and available to the other pages.");}catch{setError("Brand was not saved. Check the API server; changes currently exist only in this page session.")}finally{setS(false)}};
  return <Page title="Brand Profile" action={<button className="btn btn-primary" disabled={saving} onClick={save}>{saving?"Saving…":"Save Brand"}</button>}><State loading={loading}/>{b.synthetic&&<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Sample profile.</strong> This starter profile is synthetic and has not been retained to Hindsight. Edit it and save your brand to replace the sample.</div>}{error&&<div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}<div className="grid gap-4 lg:grid-cols-2"><Card><h2 className="mb-4 font-semibold">Brand identity</h2><div className="grid gap-4 sm:grid-cols-2">{fields.map(k=><label key={k} className="text-sm font-medium capitalize">{k}<textarea className="input mt-1 min-h-20 resize-y" value={b[k]} onChange={e=>update(k,e.target.value)}/></label>)}</div>{msg&&<p className="mt-4 text-sm text-emerald-700">{msg}</p>}</Card><Card><h2 className="mb-4 font-semibold">Current brand memory preview</h2><pre className="whitespace-pre-wrap text-sm text-slate-600">{JSON.stringify(b,null,2)}</pre></Card></div></Page>
}
