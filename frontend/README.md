This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

From the `frontend` directory, install dependencies with `npm ci` and start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Solar Roof AI backend

From the `backend` directory, install the runtime dependencies in your Python environment and start FastAPI:

```bash
python -m pip install fastapi uvicorn python-multipart numpy rasterio Pillow ultralytics
python -m uvicorn main:app --port 8000
```

Detection loads the YOLO Segmentation checkpoint from `backend/best.pt` by default.
To use a different checkpoint, set `SOLAR_MODEL_PATH` to its absolute path and restart FastAPI.

Next.js forwards `/api/solar/*` to FastAPI. The default target is
`http://127.0.0.1:8000` from the Next.js server. Set `SOLAR_BACKEND_URL` in the
Next.js environment before building when the API runs on another origin.

To enable the sample button on the upload page, provide a GeoTIFF you are
allowed to share at `backend/sample.tif`, or set `SOLAR_SAMPLE_GEOTIFF` to
its absolute path. The configured sample is available to anyone who can use the web app.

Analysis history is stored in the current browser. The backend needs persistent
`uploads` and `outputs` directories if files and report images must survive
server restarts or redeployments.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
