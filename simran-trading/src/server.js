import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Simran Trading Company site running on http://localhost:${PORT}`);
});