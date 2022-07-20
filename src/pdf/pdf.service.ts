import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Readable } from 'stream';
// tslint:disable-next-line:no-var-requires
const shell = require('shelljs');

export interface PDFRenderOptions {
    page: {
        format?: puppeteer.PaperFormat
        landscape?: boolean
        printBackground?: boolean
        height?: any
        width?: any
    },
    screen?: boolean
}

@Injectable()
export class PdfService {
    private readonly logger: Logger = new Logger(PdfService.name)

    /**
     * Render PDF From URL
     * @param url
     * @param options
     */
    async renderPdfFromUrl(url: string, options?: PDFRenderOptions) {
        this.logger.log('Try to open puppeteer browser...')
        const browser = await puppeteer.launch()
        try {
            this.logger.log('Try to open browser new page...')
            const page = await browser.newPage()

            this.logger.log(`Navigate to ${url}...`)
            await page.goto(url, {
                waitUntil: [
                    'networkidle0',
                    'load',
                    'domcontentloaded',
                    'networkidle2',
                ],
            });

            if (options) {
                await page.emulateMediaType(options.screen ? 'screen' : 'print')
            }

            this.logger.log(`Generate PDF...`)
            const pdfContent = await page.pdf(options.page)

            this.logger.log(`Close Browser...`)

            return pdfContent;
        } catch (e) {
            this.logger.log(e);
        } finally {
            await browser.close()
            shell.exec('bash src/chromecleanup.sh');
            this.logger.log('chrome cleanup complete');
        }
    }

    /**
     * Render PDF From HTML
     * @param html
     * @param options
     */
    async renderPdfFromHtml(html: string, options?: PDFRenderOptions) {
        this.logger.log('Try to open puppeteer browser...')
        const browser = await puppeteer.launch({headless: true})
        try {
            this.logger.log('Try to open browser new page...')
            const page = await browser.newPage()

            this.logger.log(`Load HTML...`)
            page.setJavaScriptEnabled(false)
            await page.goto('data:text/html,' + html, {
                waitUntil: [
                    'networkidle0',
                    'load',
                    'domcontentloaded'
                ]
            });
            // await page.setContent(html, {
            //     waitUntil: [
            //         'networkidle0',
            //         'load',
            //         'domcontentloaded'
            //     ], timeout: 0
            // })

            if (options) {
                await page.emulateMediaType(options.screen ? 'screen' : 'print')
            }
            if (!options.page.width) {
                delete options.page.width
            }
            if (!options.page.height) {
                delete options.page.height
            }
            this.logger.log(options.page)
            this.logger.log(`Generate PDF...`)
            const pdfContent = await page.pdf(options.page)

            this.logger.log(`Close Browser...`)
            return pdfContent;
        } catch (e) {
            this.logger.log(e);
        } finally {
            await browser.close();
            shell.exec('bash src/chromecleanup.sh');
            this.logger.log('chrome cleanup complete');
        }
    }

    /**
     * Create Readable Stream
     * @param buffer
     */
    createReadableStream(buffer: Buffer) {
        const stream: Readable = new Readable();
        stream.push(buffer);
        stream.push(null);
        return stream;
    }
}
