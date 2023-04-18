const ganache = require('ganache');

// Create a new Ganache server
const ganacherServer = ganache.server({
    verbose: false,
    debug: false,
    quiet: true,
    // mnemonic is required to make it deterministic
    mnemonic: "hard degree special clarify patch shield loyal purse away neglect lens mouse",
});

// Start the server
ganacherServer.listen(8545, () => {
    console.log('► Ganache launched ✓');
});

// Export the server object as a module
module.exports = { ganacherServer };