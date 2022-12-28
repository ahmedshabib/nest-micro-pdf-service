import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Readable } from 'stream';
import * as fs from 'fs-extra';
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
        const browser = await puppeteer.launch({headless: true, args: ['--disable-web-security', '--disable-dev-profile']})
        try {

            this.logger.log('Try to open browser new page...');
            const page = await browser.newPage();

            this.logger.log(`Navigate to ${url}...`);
            await page.goto(url, {
                waitUntil: [
                    'networkidle0',
                    'load',
                    'domcontentloaded',
                    'networkidle2',
                ],
            });
            if (!options) {
                options = {
                    page: {
                        printBackground: true,
                        landscape: true
                    },
                    screen: false
                }
            }
            await page.emulateMediaType(options.screen ? 'screen' : 'print')
            await page.waitForTimeout(200)

            this.logger.log(`Generate PDF...`);
            const pdfContent = await page.pdf(options.page);

            this.logger.log(`Close Browser...`);
            await browser.close();

            return pdfContent;
        } catch (e) {
            this.logger.log(e);
        } finally {
            let chromeTmpDataDir = null;

            const chromeSpawnArgs = browser.process().spawnargs;
            for (let i = 0; i < chromeSpawnArgs.length; i++) {
                if (chromeSpawnArgs[i].indexOf('--user-data-dir=') === 0) {
                    chromeTmpDataDir = chromeSpawnArgs[i].replace('--user-data-dir=', '');
                }
            }

            await browser.close();

            if (chromeTmpDataDir !== null) {
                fs.removeSync(chromeTmpDataDir);
            }
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
        const browser = await puppeteer.launch({headless: true, args: ['--disable-web-security', '--disable-dev-profile']})
        try {
            this.logger.log('Try to open browser new page...')
            const page = await browser.newPage()

            this.logger.log(`Load HTML...`)
            page.setJavaScriptEnabled(false)
            await page.setContent(html, {
                waitUntil: [
                    'networkidle2',
                    'load',
                    'domcontentloaded'
                ], timeout: 0
            })
            await page.waitForTimeout(200)
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
            let chromeTmpDataDir = null;

            const chromeSpawnArgs = browser.process().spawnargs;
            for (let i = 0; i < chromeSpawnArgs.length; i++) {
                if (chromeSpawnArgs[i].indexOf('--user-data-dir=') === 0) {
                    chromeTmpDataDir = chromeSpawnArgs[i].replace('--user-data-dir=', '');
                }
            }

            await browser.close();

            if (chromeTmpDataDir !== null) {
                fs.removeSync(chromeTmpDataDir);
            }
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

    private async emulateMediaType(
        options: PDFRenderOptions,
        page: puppeteer.Page,
    ) {
        if (options) {
            await page.emulateMediaType(options.screen ? 'screen' : 'print');
        }
    }

}
