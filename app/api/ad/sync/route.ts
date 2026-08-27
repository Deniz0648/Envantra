import { currentUser } from "@/src/auth/session";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
import { synchronizeAd } from "@/src/services/ad-sync";
export async function POST(){try{const user=await currentUser();if(user.role!=="ADMIN"&&user.role!=="IT_OPERATOR")throw new AppError("FORBIDDEN","AD senkronizasyonu için yetkiniz yok.",403);return ok(await synchronizeAd())}catch(error){return errorResponse(error)}}
