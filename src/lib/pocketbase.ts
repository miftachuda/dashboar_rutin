// /lib/pocketbase.ts
import PocketBase from "pocketbase";
//console.log("PocketBase instance created");
const baseUrl = "https://base.miftachuda.my.id";
const pb = new PocketBase(baseUrl);
pb.autoCancellation(false);
export { pb };
export { baseUrl };
