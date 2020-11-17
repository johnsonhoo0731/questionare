const koa = require('koa');
const koajwt = require('koa-jwt');
const jsonwebtoken = require('jsonwebtoken');
const koabody = require('koa-body')({ // 支持raw 和 formData
    multipart: true
});
const router = require('koa-router')();
const bcrypt = require('bcrypt');
const cors = require('koa2-cors');
const pool = require('./pool');
const app = new koa();

const SECRET = 'huyurun'; // demo，可更换

app.use(koabody);

pool.connect((err) => {
    if (err) {
        throw err;
    } else {
        console.log('数据库连接成功')
    }
})

app.use(cors({
    origin: "*",
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 3600,
    credentials: true,
    allowedMethods: ['GET', 'POST', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept']
}))

// 中间件对token进行验证
app.use(async (ctx, next) => {
    return next().catch((err) => {
        if (err.status === 401) {
            ctx.status = 401;
            ctx.body = {
                code: 401,
                msg: err.message
            }
        } else {
            throw err;
        }
    })
});

app.use(koajwt({ secret: SECRET }).unless({
    // 登录接口不需要验证
    path: [/^\/api\/login/, /^\/api\/register/]
}));


router.post('/api/login', async ctx => {
    // 校验是否登录成功，成功后返回token
    const password = ctx.request.body.password;
    const username = ctx.request.body.username;
    await new Promise((resolve, reject) => {
        // 查找对应密码
        const sql = `select pwd from usersinfo where username="${username}"`;
        pool.query(sql, async (err, res) => {
            if (err) {
                throw err;
            }
            console.log(res[0].pwd, 111)
            // 密码匹配
            await bcrypt.compare(password, res[0].pwd)
                .then(isMatch => {
                    console.log(isMatch)
                    if (isMatch) {
                        resolve('success')
                    } else {
                        resolve('failed')
                    }
                })
        })
    }).then(res => {
        if (res === 'success') {
            ctx.body = {
                code: 0,
                msg: '登录成功',
                token: jsonwebtoken.sign(
                    { name: username },  // 加密userToken, 前端需要加上Bearer
                    SECRET,
                    { expiresIn: 300 }
                )
            }
        } else {
            ctx.body = {
                code: 1,
                msg: '用户名或密码错误'
            }
        }
    })
    .catch(err => console.log(err))
})

router.post('/api/register', async ctx => {
    const username = ctx.request.body.username;
    const password = ctx.request.body.password;
    await new Promise((resolve, reject) => {
        // 查看是否有重复的用户名
        const sql = `select * from usersinfo where username = '${username}'`;
        pool.query(sql, (err, res) => {
            if (err) {
                throw err;
            }
            // 存在当前注册用户名
            if (res.length > 0) {
                resolve('exist');
            } else {
                bcrypt.genSalt(10, async (err, salt) => {
                    if (err) throw err;
                    else {
                        bcrypt.hash(password, salt, async (err, hash) => {
                            if (err) {
                                throw err;
                            }
                            // 保存账号密码到数据库表usersinfo
                            // 默认性别“中”，年龄0
                            const defaultSex = '中';
                            const sql = `insert into usersinfo set ?`;
                            const params = {
                                username,
                                pwd: hash,
                                usex: defaultSex,
                                uage: 0
                            }
                            pool.query(sql, params, (err, res) => {
                                if (err) {
                                    throw new Error(err);
                                } 
                                // 修改成功
                                if (res.affectedRows === 1) {
                                    resolve('success');
                                } else {
                                    reject(false);
                                }
                            })
                        })
                    }
                })
            }
        })
    }).then(res => {
        if (res === 'exist') {
            ctx.body = {
                code: 2,
                msg: '用户名已存在，请重新注册'
            }
        } else if (res === 'success') {
            ctx.body = {
                code: 0,
                msg: '注册成功'
            }
        }
    })
    .catch(err => {
        ctx.body = {
            code: 1,
            msg: '注册失败'
        }
    })
})


app.use(router.routes());
app.use(router.allowedMethods());
 
app.listen(3000);