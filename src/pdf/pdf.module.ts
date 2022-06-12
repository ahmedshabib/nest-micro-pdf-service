import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { PdfCreatorController } from './pdf-creator.controller';

@Module({
    providers: [PdfService],
    controllers: [PdfController, PdfCreatorController]
})
export class PdfModule {
}