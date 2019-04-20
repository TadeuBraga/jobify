const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const path = require('path') 

const sqlite = require('sqlite')
const dbConnection = sqlite.open(path.resolve(__dirname, 'banco.sqlite'), { Promise })

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')

app.use('/admin', (req, res, next) => {
    if(req.hostname == 'localhost') {
        next()
    } else {
        res.send("Not Allowed!")
    }
});

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({extended: true}))

const port = process.env.PORT || 3000

const init = async() => {
    const db = await dbConnection
     await db.run('create table if not exists categorias(id INTEGER PRIMARY KEY, categoria TEXT) ');
     await db.run('create table if not exists vagas(id INTEGER PRIMARY KEY, categoria_id INTEGER, titulo TEXT, descricao TEXT)');
    //const categoria = 'Marketing team'
    //await db.run(`insert into categorias(categoria) values('${categoria}')`);
    //const vaga = 'Marketing Digital (San Francisco)'
    //const descricao = "Vaga Marketing Digital com experiência"
    //await db.run(`insert into vagas(categoria_id, titulo, descricao) values(2,'${vaga}', '${descricao}')`);
    
};

init();
app.listen(port, function(err){
    if(err) {
        console.log('Não foi possivel iniciar!')
    } else {
        console.log('Servidor rodando')
    }
    
})

app.get('/', async(req, res) => {
    const db = await dbConnection
    const categoriasDb = await db.all('select * from categorias;')
    const vagas = await db.all('select * from vagas')
    const categorias = categoriasDb.map(cat => {
        return {
            ...cat,
            vagas: vagas.filter(vaga => {
                return vaga.categoria_id === cat.id
            })
        }
    });
    
    console.log(categorias);
    res.render('home', { categorias })
})

app.get('/vaga/:id', async(req, res) => {
    const db = await dbConnection
    const vaga = await db.get(`select * from vagas where id = ${req.params.id}`)
    res.render('vaga', {vaga})
})


app.get('/admin', (req, res) => {
    res.render('admin/home')
})


//Admin Vagas
app.get('/admin/vagas', async(req, res) => {
    const db = await dbConnection
    const vagas = await db.all('select * from vagas')
    res.render('admin/vagas', {vagas})
})

app.get('/admin/vagas/nova', async(req, res) => {
    const db = await dbConnection
    const categorias = await db.all('select * from categorias');
    res.render('admin/nova-vaga', {categorias, vaga: {}})
})

app.get('/admin/vagas/editar/:id', async(req, res) => {
    const {id} = req.params
    const db = await dbConnection
    const vaga = await db.get(`select * from vagas where id =${id}`)
    const categorias = await db.all('select * from categorias');
    res.render('admin/nova-vaga', {categorias, vaga})
})

app.post('/admin/vagas/nova', async(req, res) => {
    const db = await dbConnection
    const {titulo, descricao, categoria} = req.body
    await db.run(`insert into vagas(categoria_id, titulo, descricao) values(${categoria},'${titulo}', '${descricao}')`);
    res.redirect("/admin/vagas")
})

app.post('/admin/vagas/editar/:id', async(req, res) => {
    const db = await dbConnection
    const {id} = req.params 
    const {titulo, descricao, categoria} = req.body
    await db.run(`update vagas set categoria_id = '${categoria}', titulo = '${titulo}' , descricao = '${descricao}' where id = ${id}`);
    res.redirect("/admin/vagas")
})

app.get('/admin/vagas/delete/:id', async(req, res) => {
    const db = await dbConnection
    const vagas = await db.run(`delete from vagas where id = ${req.params.id} `)
    res.redirect('/admin/vagas')
})


//Admin Categorias
app.get('/admin/categorias/', async(req, res) => {
    const db = await dbConnection
    const categorias = await db.all('select * from categorias')
    res.render('admin/categorias', {categorias, error: null })
})

app.get('/admin/categorias/error/:error', async(req, res) => {
    const db = await dbConnection
    const categorias = await db.all('select * from categorias')
    let result = {categorias};
    result.error = req.params.error
    res.render('admin/categorias', result)
})


app.get('/admin/categorias/nova', async(req, res) => {
    res.render('admin/nova-categoria', {categoria: {}})
})

app.get('/admin/categorias/editar/:id', async(req, res) => {
    const {id} = req.params
    const db = await dbConnection
    const categoria = await db.get(`select * from categorias where id =${id}`)
    res.render('admin/nova-categoria', {categoria})
})

app.post('/admin/categorias/nova', async(req, res) => {
    const db = await dbConnection
    const {categoria} = req.body
    await db.run(`insert into categorias(categoria) values('${categoria}')`);
    res.redirect("/admin/categorias")
})

app.post('/admin/categorias/editar/:id', async(req, res) => {
    const db = await dbConnection
    const {id} = req.params 
    const {categoria} = req.body
    await db.run(`update categorias set categoria = '${categoria}' where id = ${id}`);
    res.redirect("/admin/categorias")
})

app.get('/admin/categorias/delete/:id', async(req, res) => {
    const db = await dbConnection
    const vagasPorCategoria = await db.all(`select * from vagas where categoria_id = ${req.params.id}`)  
    console.log(vagasPorCategoria) 
    if(vagasPorCategoria.length == 0){
        await db.run(`delete from categorias where id = ${req.params.id} `)
        res.redirect('/admin/categorias')
    } else {
        res.redirect('/admin/categorias/error/categoria_possui_vagas')
    }
    
})