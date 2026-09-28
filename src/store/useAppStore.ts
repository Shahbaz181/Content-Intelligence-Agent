import {create} from "zustand";
import type {Brand} from "../types";
type State={brand:Brand|null; setBrand:(brand:Brand)=>void};
export const useAppStore=create<State>(set=>({brand:null,setBrand:brand=>set({brand})}));
