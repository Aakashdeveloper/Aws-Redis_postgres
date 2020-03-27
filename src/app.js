var express = require('express');
var axios = require('axios');
var redis =  require('redis');
const Pool = require('pg').Pool
const pool = new Pool({
    user:'postgres',
    host:'database-1.ca4sdqdfjlvm.ap-southeast-1.rds.amazonaws.com',
    database:'blogdata',
    password:'admin1234',
    port:5432
})
const app = express();
const port = 7600;

const client = redis.createClient({
    host:'blogredis.yhxza4.0001.apse1.cache.amazonaws.com',
    port:6379
})

app.get('/',(req,res)=>{
    res.send('Api is working')
})

app.get('/data', (req,res) => {
    const userinput = (req.query.country).trim()
    const url = `https://en.m.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${userinput}`

    return client.get(`wiki:${userinput}`,(err,result) => {
        if(result){
            const output = JSON.parse(result);
            pool.query('INSERT INTO blog (source,title,pageid) VALUES ($1, $2, $3)',[output.source,output.parse.title,output.parse.pageid], (err,result) => {
                if(err){throw err}
                console.log('data added')
            })
            return res.send(output)
        } else {
            return axios.get(url)
                .then(response => {
                    const output = response.data;
                    client.setex(`wiki:${userinput}`,3600,JSON.stringify({source:'RedisCache',...output}))
                    pool.query('INSERT INTO blog (source,title,pageid) VALUES ($1, $2, $3)',['Api',output.parse.title,output.parse.pageid], (err,result) => {
                        if(err){throw err}
                        console.log('data added')
                    })
                    return res.json({source:'Api...',...output})
                }) 
        }
    })
})



app.listen(port,(err)=>{
    console.log(`server is running on port ${port}`)
});
