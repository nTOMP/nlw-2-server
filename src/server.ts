import express from 'express'

const app = express();

app.use(express.json());

app.get('/connections', (request, response) => {
  
})

app.listen(3333)
