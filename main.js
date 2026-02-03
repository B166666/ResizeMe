import initAvif from './avif_enc.js';
import JSZip from 'jszip';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const controls = document.getElementById('controls');
const qualityInput = document.getElementById('quality');
const qualityVal = document.getElementById('quality-val');
const compressBtn = document.getElementById('compress-btn');
const status = document.getElementById('status');
const fileList = document.getElementById('file-list');
const fileListContainer = document.getElementById('file-list-container');

let foundFiles = [];
let avifModule = null;

async function loadModule() {
    status.textContent = 'Loading compression engine...';
    try {
        avifModule = await initAvif({
            locateFile: (path) => path.endsWith('.wasm') ? '/avif_enc.wasm' : path
        });
        status.textContent = 'Engine ready.';
    } catch (err) {
        console.error(err);
        status.textContent = 'Error loading engine: ' + err.message;
    }
}
loadModule();

qualityInput.addEventListener('input', () => {
    qualityVal.textContent = qualityInput.value;
});

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#334155';
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#334155';

    const items = e.dataTransfer.items;
    foundFiles = [];

    status.textContent = 'Scanning dropped content...';

    for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
            await traverseFileTree(entry);
        }
    }

    updateFileList();
});

fileInput.addEventListener('change', async () => {
    foundFiles = Array.from(fileInput.files);
    updateFileList();
});

async function traverseFileTree(entry, isRoot = true) {
    if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve));
        if (file.type === 'image/png' || file.type === 'image/jpeg' || file.name.match(/\.(png|jpg|jpeg)$/i)) {
            foundFiles.push(file);
        }
    } else if (entry.isDirectory && isRoot) {
        const dirReader = entry.createReader();
        const entries = await new Promise((resolve) => dirReader.readEntries(resolve));
        for (let i = 0; i < entries.length; i++) {
            await traverseFileTree(entries[i], false);
        }
    }
}

function updateFileList() {
    fileListContainer.style.display = 'block';
    controls.style.display = 'flex';
    fileList.innerHTML = '';

    if (foundFiles.length === 0) {
        fileList.innerHTML = '<div style="color: #ef4444;">No valid .png or .jpg files found.</div>';
        compressBtn.disabled = true;
        return;
    }

    compressBtn.disabled = false;
    foundFiles.forEach(file => {
        const div = document.createElement('div');
        div.style.padding = '2px 0';
        div.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        fileList.appendChild(div);
    });

    status.textContent = `Found ${foundFiles.length} images. Ready to process.`;
}

compressBtn.addEventListener('click', async () => {
    if (foundFiles.length === 0 || !avifModule) return;

    compressBtn.disabled = true;
    const zip = new JSZip();
    const startTime = performance.now();

    for (let i = 0; i < foundFiles.length; i++) {
        const file = foundFiles[i];
        status.textContent = `Compressing (${i + 1}/${foundFiles.length}): ${file.name}...`;

        try {
            const result = await compressImage(file);
            if (result) {
                const newName = file.name.replace(/\.[^/.]+$/, "") + ".avif";
                zip.file(newName, result);
            }
        } catch (err) {
            console.error(`Failed to compress ${file.name}:`, err);
        }
    }

    status.textContent = 'Generating ZIP...';
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);

    const link = document.createElement('a');
    link.href = url;
    link.download = "compressed_images.zip";
    link.click();

    const endTime = performance.now();
    status.textContent = `Batch complete! Total time: ${((endTime - startTime) / 1000).toFixed(2)}s.`;
    compressBtn.disabled = false;
});

async function compressImage(file) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    const options = {
        quality: parseInt(qualityInput.value),
        qualityAlpha: parseInt(qualityInput.value),
        denoiseLevel: 0,
        tileRowsLog2: 0,
        tileColsLog2: 0,
        speed: 8,
        subsample: 1,
        chromaDeltaQ: false,
        sharpness: 0,
        enableSharpYUV: false,
        tune: 0
    };

    return avifModule.encode(imageData.data, imageData.width, imageData.height, options);
}
