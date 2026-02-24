import express from 'express';
import cors from 'cors';
import proxy from 'express-http-proxy';
import {rateLimit, ipKeyGenerator } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import morgan from 'morgan';
import axios from 'axios';
import cookieParser from 'cookie-parser'

const app = express();

app.use(cors({
  origin: ['http://localhost:3000'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
}))

app.use(morgan('dev'))
app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({limit: "100mb", extended: true}));
app.set('trust proxy', 1);

// Rate Limiting
const MILSECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTE = SECONDS_PER_MINUTE * MILSECONDS_PER_SECOND;

const LOGGED_IN_USER_ALLOWED_REQUESTS_TOTAL = 1000;
const UNLOGGED_IN_USER_ALLOWED_REQUESTS_TOTAL = 100;

const rateLimiter = rateLimit({
  windowMs: MINUTE * 15,
  limit: (request: any) => (request.user ? LOGGED_IN_USER_ALLOWED_REQUESTS_TOTAL : UNLOGGED_IN_USER_ALLOWED_REQUESTS_TOTAL),
  message: {error: "Too many requests, please try again later!"}, 
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (request) => ipKeyGenerator(request.ip ?? ""),
})

app.use(rateLimiter); 

app.get('/gateway-health', (req, res) => {
  res.send({ message: 'Welcome to api-gateway!' });
});

app.use('/', proxy('http://localhost:6001'))

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
