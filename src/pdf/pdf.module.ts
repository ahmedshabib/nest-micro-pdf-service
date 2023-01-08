import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { PdfCreatorController } from './pdf-creator.controller';
import { PdfFormCreatorController } from "./pdf-form-creator.controller";

@Module({
    providers: [PdfService],
    controllers: [PdfController, PdfCreatorController, PdfFormCreatorController]
})
export class PdfModule {
}