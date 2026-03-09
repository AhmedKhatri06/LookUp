import Urlbox from 'urlbox';
import dotenv from 'dotenv';
dotenv.config();

const urlbox = Urlbox(process.env.URLBOX_API_KEY, process.env.URLBOX_API_SECRET);

const optionsHtml = {
    url: 'https://linkedin.com/in/mihirdoshi',
    format: 'html',
};

const optionsPng = {
    url: 'https://linkedin.com/in/mihirdoshi',
    format: 'png',
    full_page: true
};

console.log("HTML Preview URL:", urlbox.generateRenderLink(optionsHtml));
console.log("PNG Preview URL:", urlbox.generateRenderLink(optionsPng));
