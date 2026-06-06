import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

export class DownloadManager {
    private static getElectronWindow(): any | null {
        try {
            const electron = (window as any).require?.('electron');
            if (!electron) {
                return null;
            }

            const remoteModule = electron.remote ?? (window as any).require?.('@electron/remote');
            if (remoteModule?.getCurrentWindow) {
                return remoteModule.getCurrentWindow();
            }

            if (remoteModule?.BrowserWindow?.getFocusedWindow) {
                return remoteModule.BrowserWindow.getFocusedWindow();
            }
        } catch (error) {
            console.warn('获取 Electron 窗口失败，回退到 DOM 导出', error);
        }

        return null;
    }

    private static async waitForExportReady(): Promise<void> {
        if ('fonts' in document && document.fonts?.ready) {
            try {
                await document.fonts.ready;
            } catch (error) {
                console.warn('等待字体加载失败，继续导出', error);
            }
        }

        await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
        await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private static async captureWithElectron(imageElement: HTMLElement): Promise<Blob | null> {
        const currentWindow = this.getElectronWindow();
        if (!currentWindow?.capturePage) {
            return null;
        }

        const rect = imageElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            throw new Error('预览区域尺寸无效，无法截图');
        }

        try {
            const nativeImage = await currentWindow.capturePage();
            const fullSize = nativeImage?.getSize?.();

            if (!fullSize || fullSize.width <= 0 || fullSize.height <= 0) {
                return null;
            }

            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const scaleX = fullSize.width / viewportWidth;
            const scaleY = fullSize.height / viewportHeight;

            const cropRect = {
                x: Math.max(0, Math.round(rect.left * scaleX)),
                y: Math.max(0, Math.round(rect.top * scaleY)),
                width: Math.max(1, Math.round(rect.width * scaleX)),
                height: Math.max(1, Math.round(rect.height * scaleY))
            };

            const croppedImage = nativeImage.crop(cropRect);
            const pngBuffer = croppedImage?.toPNG?.();
            if (pngBuffer && pngBuffer.length > 0) {
                return new Blob([pngBuffer], { type: 'image/png' });
            }
        } catch (error) {
            console.warn('Electron capturePage 导出失败，回退到 DOM 导出', error);
        }

        return null;
    }

    private static async exportElementToBlob(imageElement: HTMLElement): Promise<Blob> {
        const electronBlob = await this.captureWithElectron(imageElement);
        if (electronBlob) {
            return electronBlob;
        }

        try {
            const blob = await htmlToImage.toBlob(imageElement, this.getExportConfig(imageElement));
            if (blob instanceof Blob) {
                return blob;
            }
            throw new Error('Blob 对象为空');
        } catch (err) {
            console.warn('html-to-image toBlob 导出失败，尝试 toCanvas', err);
            try {
                const canvas = await htmlToImage.toCanvas(imageElement, this.getExportConfig(imageElement));
                return await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas 转换为 Blob 失败'));
                        }
                    }, 'image/png', 1);
                });
            } catch (canvasErr) {
                console.warn('html-to-image toCanvas 导出失败，尝试 html2canvas', canvasErr);
            }

            const canvas = await html2canvas(imageElement, {
                backgroundColor: null,
                scale: 4,
                useCORS: true,
                logging: false,
                width: imageElement.offsetWidth,
                height: imageElement.offsetHeight,
                windowWidth: document.documentElement.clientWidth,
                windowHeight: document.documentElement.clientHeight
            });

            return await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('html2canvas 转换为 Blob 失败'));
                    }
                }, 'image/png', 1);
            });
        }
    }

    // 添加共用的导出配置方法
    private static getExportConfig(imageElement: HTMLElement) {
        return {
            quality: 1,
            pixelRatio: 4,
            skipFonts: false,
            // 添加过滤器，确保所有元素都被包含
            filter: (node: Node) => {
                return true;
            },
            // 处理图片加载错误
            imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        };
    }

    static async downloadAllImages(element: HTMLElement): Promise<void> {
        try {
            const zip = new JSZip();
            const previewContainer = element.querySelector('.red-preview-container');
            if (!previewContainer) throw new Error('找不到预览容器');

            const ACTIVE_CLASS = 'red-section-active';
            const VISIBLE_CLASS = 'red-section-visible';
            const HIDDEN_CLASS = 'red-section-hidden';
            const sections = Array.from(previewContainer.querySelectorAll<HTMLElement>('.red-content-section'));
            const totalSections = sections.length;

            if (totalSections === 0) {
                throw new Error('没有可导出的内容页');
            }

            const imageElement = element.querySelector<HTMLElement>('.red-image-preview');
            if (!imageElement) {
                throw new Error('找不到预览区域');
            }

            const originalVisibility = sections.map(section => ({
                active: section.classList.contains(ACTIVE_CLASS),
                visible: section.classList.contains(VISIBLE_CLASS),
                hidden: section.classList.contains(HIDDEN_CLASS)
            }));

            let successCount = 0;

            try {
                for (let i = 0; i < totalSections; i++) {
                    try {
                        sections.forEach(section => {
                            section.classList.remove(ACTIVE_CLASS);
                            section.classList.remove(VISIBLE_CLASS);
                            section.classList.add(HIDDEN_CLASS);
                        });

                        sections[i].classList.add(ACTIVE_CLASS, VISIBLE_CLASS);
                        sections[i].classList.remove(HIDDEN_CLASS);

                        await this.waitForExportReady();
                        const blob = await this.exportElementToBlob(imageElement);
                        zip.file(`小红书笔记_第${i + 1}页.png`, blob);
                        successCount++;
                    } catch (err) {
                        console.error(`第${i + 1}页导出失败`, err);
                    }
                }
            } finally {
                sections.forEach((section, index) => {
                    section.classList.toggle(ACTIVE_CLASS, originalVisibility[index].active);
                    section.classList.toggle(VISIBLE_CLASS, originalVisibility[index].visible);
                    section.classList.toggle(HIDDEN_CLASS, originalVisibility[index].hidden);
                });
            }

            if (successCount === 0) {
                throw new Error('所有页面导出都失败了');
            }

            // 创建下载
            const content = await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 9
                }
            });

            if (!(content instanceof Blob)) {
                throw new Error('生成的压缩文件不是有效的 Blob 对象');
            }

            const url = URL.createObjectURL(content);
            const link = Object.assign(document.createElement('a'), {
                href: url,
                download: `小红书笔记_${Date.now()}.zip`
            });

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('导出图片失败:', error);
            throw error;
        }
    }

    static async downloadSingleImage(element: HTMLElement): Promise<void> {
        try {
            const imageElement = element.querySelector('.red-image-preview') as HTMLElement;
            if (!imageElement) {
                throw new Error('找不到预览区域');
            }

            await this.waitForExportReady();
            const blob = await this.exportElementToBlob(imageElement);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `小红书笔记_${new Date().getTime()}.png`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('导出图片失败:', error);
            throw error;
        }
    }
}
