const { Jimp } = require('jimp');
const path = require('path');

async function trimFavicon() {
    const inputPath = path.join(__dirname, '../client/public/Vudki_fav_icon.png');

    try {
        console.log(`Reading image from ${inputPath}`);

        let img;
        // Fix for different Jimp export styles
        if (Jimp.read) {
            img = await Jimp.read(inputPath);
        } else if (Jimp.default && Jimp.default.read) {
            img = await Jimp.default.read(inputPath);
        } else {
            console.log('Jimp keys:', Object.keys(Jimp));
            throw new Error('Jimp.read not found');
        }

        console.log('Original size:', img.bitmap.width, 'x', img.bitmap.height);

        // Autocrop: removes transparent borders
        img.autocrop();

        console.log('New size:', img.bitmap.width, 'x', img.bitmap.height);

        // await img.writeAsync(inputPath);
        await new Promise((resolve, reject) => {
            img.write(inputPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('Favicon trimmed and saved.');

    } catch (err) {
        console.error('Error processing favicon:', err);
    }
}

trimFavicon();
