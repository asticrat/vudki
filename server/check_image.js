const { Jimp } = require('jimp');
const path = require('path');

async function run() {
    const filename = '1769958403070-recipt_sample.jpg';
    const fullPath = path.join(__dirname, 'uploads', filename);
    console.log('Checking:', fullPath);

    try {
        const image = await Jimp.read(fullPath);
        console.log('Dimensions:', image.bitmap.width, 'x', image.bitmap.height);
    } catch (e) {
        console.error('Failed:', e);
    }
}
run();
