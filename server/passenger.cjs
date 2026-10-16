/*
  Startup file for cPanel "Setup Node.js App" (Phusion Passenger).
  Passenger loads the startup file with require(); the API is an ES module
  with top-level await, which require() cannot load, so this CommonJS file
  imports it instead.
*/
import('./server.js').catch((error) => {
  console.error('RMA API failed to start:', error);
  process.exit(1);
});
