import { Body, Controller, Logger, Post, Request, Response } from '@nestjs/common';

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as moment from "moment";
import fetch from 'node-fetch';

const FONT_MAPPING: any = {};

@Controller('pdf-creator')
export class PdfCreatorController {
  private readonly logger: Logger = new Logger(PdfCreatorController.name)

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

  async writeNodes(currentPage, pdfDoc, pages, nodes, dataNodes, data, height, pageNo, padding, textColor = null) {
    for (const node of nodes) {
      let red = 0;
      let green = 0;
      let blue = 0;
      try {
        if (dataNodes.includes(node.key)) {
          if (node.type === 'text') {
            if (node.color) {
              const {r, g, b} = node?.color;
              red = r;
              green = g;
              blue = b;
            }
            if (textColor) {
              const {r, g, b} = textColor;
              red = r;
              green = g;
              blue = b;
            }
            currentPage.drawText(this.cleanText(data[node.key]) + '', {
              x: node.position.x + padding.pad_x,
              y: height - node.position.y - padding.pad_y,
              lineHeight: node.lineHeight || 10,
              size: node.fontSize || 10,
              color: rgb(red, green, blue),
              font: FONT_MAPPING[node.fontFamily] || FONT_MAPPING.helvetica,
              maxWidth: node.width,
            });
          } else if (node.type === 'bar_code') {
            currentPage.drawText(this.cleanText(data[node.key]) + '', {
              x: node.position.x + padding.pad_x,
              y: height - node.position.y - padding.pad_y,
              lineHeight: node.lineHeight || 10,
              size: node.fontSize || 10,
              font: FONT_MAPPING[node.fontFamily] || FONT_MAPPING.helvetica,
              maxWidth: node.width,
            });
          } else if (
              node.type === 'date' &&
              data[node.key] &&
              data[node.key].$date
          ) {
            const date = this.toDateTime(data[node.key].$date / 1000);
            currentPage.drawText(moment(date).format('D MMM, yyyy'), {
              x: node.position.x + padding.pad_x,
              y: height - node.position.y - padding.pad_y,
              lineHeight: node.lineHeight || 10,
              size: node.fontSize || 10,
              font: FONT_MAPPING[node.fontFamily] || FONT_MAPPING.helvetica,
              maxWidth: node.width,
            });
          } else if (node.type === 'image') {
            const imageBytes = await fetch(data[node.key]).then((res) =>
                res.arrayBuffer(),
            );
            let img = null;
            try {
              img = await pdfDoc.embedPng(imageBytes);
            } catch (e) {
              try {
                img = await pdfDoc.embedJpg(imageBytes);
              } catch (e) {
                this.logger.log(e);
              }
            }
            currentPage.drawImage(img, {
              x: node.position.x + padding.pad_x,
              y: height - node.position.y - padding.pad_y,
              width: node.width,
              height: node.height,
            });
          } else if (node.type === 'multiple') {
            if (node.color) {
              const {r, g, b} = node?.color;
              red = r;
              green = g;
              blue = b;
            }
            node.positions.forEach((position: any) => {
              if (data[node.key]) {
                pages[pageNo].drawText(this.cleanText(data[node.key]) + '', {
                  x: position.x + padding.pad_x,
                  y: height - position.y - padding.pad_y,
                  color: rgb(red, green, blue),
                  size: node.fontSize || 10,
                  lineHeight: node.lineHeight || 10,
                  font:
                      FONT_MAPPING[node.fontFamily] || FONT_MAPPING.helvetica,
                  maxWidth: node.width,
                });
              }
            });
          } else if (node.type === 'multi_text') {
            // If the list page increases, duplicate the page, and continue it in the next page.
            let lines = data[node.key].split('\n');
            const totalPages = lines.length / (node.maxLines || 1);
            for (let i = 1; i < totalPages; i += 1) {
              const [donorPage] = await pdfDoc.copyPages(pdfDoc, [0]);
              pdfDoc.insertPage(i, donorPage);
            }
            const allPages = pdfDoc.getPages();
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < allPages.length; i += 1) {
              allPages[i].drawText(
                  this.cleanText(lines.slice(0, node.maxLines).join('\n')) + '',
                  {
                    x: node.position.x,
                    y: height - node.position.y,
                    lineHeight: node.lineHeight || 10,
                    size: node.fontSize || 10,
                    font:
                        FONT_MAPPING[node.fontFamily] || FONT_MAPPING.helvetica,
                    maxWidth: node.width,
                  },
              );
              lines = lines.slice(node.maxLines);
            }
          } else if (node.type === 'sub') {
            // If the list page increases, duplicate the page, and continue it in the next page.
            const totalPages = data[node.key].length / (node.maxPerPage || 1);
            for (let i = 1; i < totalPages; i += 1) {
              const [donorPage] = await pdfDoc.copyPages(pdfDoc, [0]);
              pdfDoc.insertPage(i, donorPage);
            }
            for (let j = 0; j < data[node.key].length; j += 1) {
              // Boundary condition
              await this.renderPDF(
                  node.nodes,
                  data[node.key][j],
                  pdfDoc,
                  height,
                  pageNo + Math.floor(j / (node.maxPerPage || 1)),
                  {
                    pad_x:
                        node.position.pad_x *
                        Math.floor(j % (node.maxPerPage || 1)),
                    pad_y:
                        node.position.pad_y *
                        Math.floor(j % (node.maxPerPage || 1)),
                  },
                  null,
                  null,
                  textColor
              );
            }
          }
        } else if (node.value) {
          if (node.color) {
            const {r, g, b} = node?.color;
            red = r;
            green = g;
            blue = b;
          }
          currentPage.drawText(this.cleanText(node.value) + '', {
            x: node.position.x + padding.pad_x,
            y: height - node.position.y - padding.pad_y,
            lineHeight: node.lineHeight || 10,
            color: rgb(red, green, blue),
            size: node.fontSize || 10,
            font: FONT_MAPPING[node.fontFamily] || FONT_MAPPING.helvetica,
            maxWidth: node.width,
          });
        }
      } catch (e) {
        this.logger.log(e);
      }
    }
  }

  async renderPDF(
      nodes: any,
      data: any,
      pdfDoc: any,
      height: any,
      pageNo = 0,
      padding = {pad_x: 0, pad_y: 0},
      otherConfigs: any = null,
      displayCopy: string = 'all',
      textColor: any = null
  ) {
    // const notoSansBytes = fs.readFileSync('notosans.ttf');
    const pages = pdfDoc.getPages();
    const dataNodes: any = Object.keys(data);
    const currentPage = pages[pageNo];
    await this.writeNodes(currentPage, pdfDoc, pages, nodes, dataNodes, data, height, pageNo, padding, textColor);
    if (otherConfigs && otherConfigs.enablePageAppend) {
      const appendPDFData: any = await this.downloadPage(
          otherConfigs.appendPageURL,
      );
      const appendPDFDoc = await PDFDocument.load(appendPDFData);
      // const appenddocpages = appendPDFDoc.getPages();
      const [donorPage] = await pdfDoc.copyPages(appendPDFDoc, [0]);
      pdfDoc.addPage(donorPage);
    }

    if (otherConfigs && otherConfigs.enableDuplicate) {
      const subpages = pdfDoc.getPages();
      let copyIndex = 0;
      if (displayCopy === 'all') {
        for (let i = 1; i < otherConfigs.copies.length; i++) {
          for (let j = 0; j < subpages.length; j++) {
            const [donorPage] = await pdfDoc.copyPages(pdfDoc, [j]);
            for (const node of otherConfigs.copies[i].nodes) {
              donorPage.drawText(node.value + '', {
                x: node.position.x + padding.pad_x,
                y: height - node.position.y - padding.pad_y,
                lineHeight: node.lineHeight || 10,
                size: node.fontSize || 10,
                font:
                    FONT_MAPPING[node.fontFamily] || FONT_MAPPING.helvetica,
                maxWidth: node.width,
              });
            }
            pdfDoc.addPage(donorPage);
          }
        }
      } else {
        for (let i = 1; i < otherConfigs.copies.length; i++) {
          if (otherConfigs.copies[i].copyName === displayCopy) {
            copyIndex = i;
          }
        }
      }
      for (const item of subpages) {
        for (const node of otherConfigs.copies[copyIndex].nodes) {
          item.drawText(node.value + '', {
            x: node.position.x + padding.pad_x,
            y: height - node.position.y - padding.pad_y,
            lineHeight: node.lineHeight || 10,
            size: node.fontSize || 10,
            font: FONT_MAPPING[node.fontFamily] || FONT_MAPPING.helvetica,
            maxWidth: node.width,
          });
        }
      }
    }
    if (otherConfigs && otherConfigs.enableContentDuplicationInPages) {
      console.log("here")
      // tslint:disable-next-line:no-shadowed-variable
      const pages = pdfDoc.getPages();
      let copyIndex = 0;
      for (let i = 0; i < otherConfigs.pages.length; i++) {
        copyIndex = i;
        await this.writeNodes(
            pages[otherConfigs.pages[i].pageNo - 1],
            pdfDoc,
            pages,
            nodes,
            dataNodes,
            data,
            height,
            otherConfigs.pages[i].pageNo - 1,
            padding,
            otherConfigs.pages[i].textColor
        );
      }
    }

    return Promise.resolve();
  }

  async generatePDFFromConfig(config: any, response: any) {
    this.logger.log('Generating PDFs');
    const pdfData: any = await this.downloadPage(config.sourcePDFUrl);
    const pdfDoc = await PDFDocument.load(pdfData);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
    FONT_MAPPING.courier = courierFont;
    FONT_MAPPING.helvetica = courierFont;
    const pages = pdfDoc.getPages();
    const {height} = pages[0].getSize();
    const newPdfDoc = await this.renderPDF(
        config.nodes,
        config.data,
        pdfDoc,
        height,
        0,
        {pad_x: 0, pad_y: 0},
        config.otherConfigs || {},
        config.displayCopy,
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

  private cleanText(text: string) {
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
