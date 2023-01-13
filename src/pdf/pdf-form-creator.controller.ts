import { Body, Controller, Logger, Post, Request, Response } from '@nestjs/common';

import { PDFDocument, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';

const FONT_MAPPING: any = {};

@Controller('pdf-form-creator')
export class PdfFormCreatorController {
    private readonly logger: Logger = new Logger(PdfFormCreatorController.name)

    constructor() {
        // [START browser]
    }

    async downloadPage(url: string) {
        //  Only HTTP Url supported
        const formPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
        return formPdfBytes;
    }

    toDateTime(secs) {
        const t = new Date(0); // Epoch
        t.setUTCSeconds(secs + t.getTimezoneOffset() * 60);
        return t;
    }


    async renderPDF(
        fields: any,
        pdfDoc: any,
        pageNo = 0,
        otherConfigs: any = null
    ) {
        // const notoSansBytes = fs.readFileSync('notosans.ttf');
        const pages = pdfDoc.getPages();
        const dataNodes: any = Object.keys(fields);
        const form = pdfDoc.getForm()
        let enableMaxLine = false;
        let maxLineKey = '';
        let maxLineValue = '';
        let maxLineLength = 0;
        let maxLineLimit = 1000;
        let maxField: any = null;
        let maxFieldPosition = null;
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < dataNodes.length; i++) {
            try {
                if (typeof fields[dataNodes[i]] === 'string') {
                    const field = form.getTextField(dataNodes[i]);
                    const widget = field.acroField.getWidgets()[0];
                    const appearance = widget.getDefaultAppearance().split(' ');
                    const position = widget.getRectangle();
                    position.fontSize = appearance[1]
                    position.fontFamily = appearance[0]
                    pages[pageNo].drawText(
                        this.cleanText(fields[dataNodes[i]] + '', otherConfigs) + '',
                        {
                            x: position.x + 1,
                            y: position.y + position.height - 10,
                            // tslint:disable-next-line:radix
                            lineHeight: parseInt(position.fontSize) + 1,
                            size: parseInt(position.fontSize),
                            font: FONT_MAPPING.courier,
                            maxWidth: position.width + 10,
                        },
                    );
                    // field.setText(fields[dataNodes[i]]);
                } else if (typeof fields[dataNodes[i]] === 'object') {
                    const field = form.getTextField(dataNodes[i]);
                    maxLineLength = fields[dataNodes[i]].value.split('\n').length;
                    maxLineLimit = fields[dataNodes[i]].max_lines;
                    if (maxLineLength > fields[dataNodes[i]].max_lines) {
                        enableMaxLine = true;
                        maxLineValue = fields[dataNodes[i]].value;
                        maxLineKey = dataNodes[i];
                        maxField = field;
                        const widget = maxField.acroField.getWidgets()[0];
                        maxFieldPosition = widget.getRectangle()
                        const appearance = widget.getDefaultAppearance().split(' ');
                        maxFieldPosition.fontSize = appearance[1]
                        maxFieldPosition.fontFamily = appearance[0]

                    } else {
                        const widget = field.acroField.getWidgets()[0];
                        const appearance = widget.getDefaultAppearance().split(' ');
                        const position = widget.getRectangle();
                        position.fontSize = appearance[1]
                        position.fontFamily = appearance[0]
                        pages[pageNo].drawText(
                            this.cleanText(fields[dataNodes[i]].value, otherConfigs) + '',
                            {
                                x: position.x + 1,
                                y: position.y + position.height - 10,
                                // tslint:disable-next-line:radix
                                lineHeight: parseInt(position.fontSize) + 1,
                                // tslint:disable-next-line:radix
                                size: parseInt(position.fontSize),
                                font: FONT_MAPPING.courier,
                                maxWidth: position.width + 10,
                            },
                        );
                    }
                }
            } catch (e) {
                console.log(e);
            }
        }
        form.flatten();
        if (maxField && maxFieldPosition) {
            for (let i = 1; i < maxLineLength / maxLineLimit; i++) {
                const [donorPage] = await pdfDoc.copyPages(pdfDoc, [0]);
                // const pageForm = donorPage.getForm()
                // const pageField = pageForm.getTextField('##shipper_address##')
                // pageField.setText(i);
                pdfDoc.insertPage(i, donorPage);
            }
            const allPages = pdfDoc.getPages();
            let lines = maxLineValue.split('\n');
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < allPages.length; i += 1) {
                allPages[i].drawText(
                    this.cleanText(lines.slice(0, maxLineLimit).join('\n'), otherConfigs) + '',
                    {
                        x: maxFieldPosition.x + 1,
                        y: maxFieldPosition.y + maxFieldPosition.height - 5,
                        size: parseInt(maxFieldPosition.fontSize),
                        lineHeight: parseInt(maxFieldPosition.fontSize) + 1,
                        font: FONT_MAPPING.courier,
                        maxWidth: maxFieldPosition.width,
                    },
                );
                lines = lines.slice(maxLineLimit);
            }
        }
        if (otherConfigs && otherConfigs.enablePageAppend) {
            const appendPDFData: any = await this.downloadPage(
                otherConfigs.appendPageURL,
            );
            const appendPDFDoc = await PDFDocument.load(appendPDFData);
            // const appenddocpages = appendPDFDoc.getPages();
            const [donorPage] = await pdfDoc.copyPages(appendPDFDoc, [0]);
            pdfDoc.addPage(donorPage);
        }
        if (otherConfigs && otherConfigs.enableContentDuplicationInPages) {
            // tslint:disable-next-line:no-shadowed-variable
            const pages = pdfDoc.getPages();
            let copyIndex = 0;
            for (let i = 0; i < otherConfigs.pages.length; i++) {
                copyIndex = i;
                // await this.writeNodes(
                //     pages[otherConfigs.pages[i].pageNo - 1],
                //     pdfDoc,
                //     pages,
                //     nodes,
                //     dataNodes,
                //     data,
                //     height,
                //     otherConfigs.pages[i].pageNo - 1,
                //     padding,
                //     otherConfigs.pages[i].textColor,
                //     otherConfigs
                // );
            }
        }

        return Promise.resolve();
    }

    async generatePDFFromConfig(config: any, response: any) {
        this.logger.log('Generating PDFs');
        const pdfData: any = await this.downloadPage(config.sourcePDFUrl);
        const pdfDoc = await PDFDocument.load(pdfData);
        const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        FONT_MAPPING.courier = courierFont;
        FONT_MAPPING.helvetica = helveticaFont;
        FONT_MAPPING.timesRoman = timesRomanFont;
        const pages = pdfDoc.getPages();
        const {height} = pages[0].getSize();
        const newPdfDoc = await this.renderPDF(
            config.fields,
            pdfDoc,
            0,
            config.otherConfigs || {}
        );
        const pdfBytes = await pdfDoc.save();
        // fs.writeFileSync('test.pdf', pdfBytes);
        response.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=' + config.fileName,
            'Content-Length': pdfBytes.length,
        });
        response.end(Buffer.from(pdfBytes));
    }

    @Post(['/'])
    async getData(@Request() request, @Response() response, @Body() requestBody) {
        const config = requestBody.config;
        this.logger.log('Request  Loaded');

        const pdfBytes = this.generatePDFFromConfig(config, response);
        this.logger.log('Response Done');
    }

    private cleanText(text: string, otherConfigs: any = null) {
        if (otherConfigs?.textUpperCase) {
            text = text.toUpperCase();
        }
        // remove x0002 asci character from text
        if (typeof text === 'string') {
            text = text.replace(/\u0002/g, '');
            let re = /\r\n/gi;
            text = text.replace(re, ' \n');
            re = /\n/gi;
            text = text.replace(re, ' \n');
            return text.normalize('NFKD').replace(/[^\x00-\xFF]/g, '');
        } else {
            return text;
        }
    }
}
