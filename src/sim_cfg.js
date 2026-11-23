const F = require('./engine.js');
Object.assign(F.CONFIG, JSON.parse(process.argv[2]));
process.argv.splice(2, 1);
require('./sim.js');
