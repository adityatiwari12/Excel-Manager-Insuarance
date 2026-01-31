import http from 'http';

const payload = JSON.stringify({
    dataset: 'Debug API Test',
    data: {
        serialNumber: 'DEBUG-001',
        policyNumber: 'P1',
        claimNumber: 'C1',
        vehicleNumber: 'V1',
        title: 'Debug Title',
        date: '2024-01-31'
    }
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/submit',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response Body:');
        console.log(data);
    });
});

req.on('error', (error) => {
    console.error('Request Error:', error);
});

req.write(payload);
req.end();
