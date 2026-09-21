import { Inject, Injectable, Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";

export type Correo = {
	para: string;
	asunto: string;
	html: string;
	texto?: string;
};

/**
 * Mandar correo por SMTP.
 *
 * POR QUÉ SMTP Y NO EL SDK DE SES. Hoy SMTP apunta al mismo SES que ya
 * funciona, pero el día que se cambie de proveedor lo único que cambia es una
 * variable de entorno. Con el SDK habría que reescribir esto, y antes de eso
 * había que arrastrar el rodeo que tenía la Lambda: enviaba asumiendo un rol
 * de OTRA cuenta, porque el SES de la cuenta de la app está en sandbox.
 *
 * SIN `SMTP_URL` NO MANDA Y NO REVIENTA. Un pedido que se cobra y se produce
 * no puede fallar porque el correo de confirmación no salga; se avisa en el
 * log y el trabajo de la cola termina bien.
 */
@Injectable()
export class CorreoService {
	private readonly log = new Logger(CorreoService.name);
	private readonly transporte: Transporter | null;

	constructor(@Inject(ENTORNO) private readonly env: Entorno) {
		this.transporte = env.SMTP_URL
			? nodemailer.createTransport(env.SMTP_URL)
			: null;

		if (!this.transporte) {
			this.log.warn("Sin SMTP_URL: los correos se registran y no se envían");
		}
	}

	async enviar(correo: Correo) {
		if (!this.transporte) {
			this.log.log(`[sin enviar] ${correo.para} — ${correo.asunto}`);
			return { enviado: false };
		}

		await this.transporte.sendMail({
			from: this.env.CORREO_DESDE,
			to: correo.para,
			subject: correo.asunto,
			html: correo.html,
			text: correo.texto,
		});

		return { enviado: true };
	}
}
