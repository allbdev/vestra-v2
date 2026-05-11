import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ContactService } from "./contact.service";
import { ContactDto } from "./dto/contact.dto";
import { Public } from "../common/decorators/public.decorator";

@ApiTags("contact")
@Controller("contact")
export class ContactController {
  constructor(private contact: ContactService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  submit(@Body() dto: ContactDto) {
    return this.contact.submit(dto);
  }
}
