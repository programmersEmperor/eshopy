import swaggerAutogen from 'swagger-autogen';

const doc = {
    info: {
        title: 'Eshopy Auth Service',
        description: 'Eshopy Auth Service API Documentation',
        version: '1.0.0',
    },
    schemes: ['http'],
    host: `localhost:${process.env.PORT || 6001}`,
}

const endpointsFiles = ['./routes/auth.router.ts'];
const outputFile = './swagger-output.json';

swaggerAutogen()(outputFile, endpointsFiles, doc);
