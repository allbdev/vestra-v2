import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { ContactDto } from "./dto/contact.dto";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async submit(dto: ContactDto) {
    const message = await this.prisma.message.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
      },
    });

    try {
      await this.email.sendContactForm({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
      });
    } catch (err) {
      // DB row is the durable record; don't fail the request if forwarding bombs.
      this.logger.error(`Failed to forward contact ${message.id}: ${(err as Error).message}`);
    }

    return { ok: true, id: message.id };
  }
}
