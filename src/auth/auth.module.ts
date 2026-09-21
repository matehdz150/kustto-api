import { Global, Module } from "@nestjs/common";
import { GuardAdmin, GuardComprador, GuardTaller } from "./auth.guard";

@Global()
@Module({
	providers: [GuardComprador, GuardTaller, GuardAdmin],
	exports: [GuardComprador, GuardTaller, GuardAdmin],
})
export class AuthModule {}
