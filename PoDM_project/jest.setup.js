const { TextEncoder, TextDecoder } = require('util');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;