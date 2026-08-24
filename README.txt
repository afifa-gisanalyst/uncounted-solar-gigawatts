UNCOUTED SOLAR GIGAWATTS
=========================

An interactive web dashboard for exploring rooftop solar PV potential across
Islamabad, Lahore and Karachi.

REQUIREMENTS
------------

- Node.js
- npm
- Docker (optional)

RUN LOCALLY
-----------

Open the frontend folder:

cd frontend
npm install
npm run dev

Then open the local URL shown by Vite in the terminal.

RUN WITH DOCKER
---------------

From the frontend folder:

docker build -t uncounted-solar-gigawatts .
docker run -d -p 8081:80 --name uncounted-solar-gigawatts uncounted-solar-gigawatts

Open:

http://localhost:8081

DASHBOARD
---------

The dashboard allows users to:

- Explore buildings and rooftop solar PV data.
- Switch between Islamabad, Lahore and Karachi.
- View individual building and solar PV information.
- Explore overall solar potential and project statistics.

PROJECT STRUCTURE
-----------------

frontend/
├── src/
├── public/
├── Dockerfile
├── package.json
└── package-lock.json

The GeoJSON datasets are stored inside:

frontend/public/data/
