import { redirect } from "next/navigation";
import { currentUser } from "@/src/auth/session";
import { accessibleLocations } from "@/src/auth/locations";
import { LocationSelector } from "@/components/location-selector";
export default async function SelectPage(){let user:Awaited<ReturnType<typeof currentUser>>;try{user=await currentUser()}catch{redirect("/login")}const locations=await accessibleLocations(user);if(locations.length===1){redirect(`/api/preferences/location?siteId=${locations[0]!.siteId}`)}return <LocationSelector locations={locations}/>}
