const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');

const  {app} = require('./../server');
const {Todo} = require('./../models/todo');
const {User} = require('./../models/user');
const {todos, populateTodos, users, populateUsers} = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {
    it('should create a new todo', (done) => {
        var text = 'Test todo test';
        request(app)
          .post('/todos')
          .set('x-auth', users[0].tokens[0].token)
          .send({text})
          .expect(200)
          .expect((res) => {
            expect(res.body.text).toBe(text);
        })
          .end((err, res) => {
              if(err)
                return done(err)
            Todo.find({text}).then((todos) => {
                expect(todos.length).toBe(1);
                expect(todos[0].text).toBe(text);
                done();
            }).catch((e) => {done(e)});
          });
    });

    it('should not create todo with invalid data', (done) => {
        request(app).
          post('/todos')
          .send({})
          .set('x-auth', users[0].tokens[0].token)
          .expect(400)
          .end((err, res) => {
              if(err)
                return done(err);
              Todo.find().then((todos) => {
                  expect(todos.length).toBe(2);
                  done();
              }).catch((e) => done(e)); 
          });
    });
});


describe('GET /todos', () => {
    it('should get all todos', (done) => {
        request(app)
          .get('/todos')
          .set('x-auth', users[0].tokens[0].token)
          .expect(200)
          .expect((res) => {
            expect(res.body.todos.length).toBe(1);
          })
          .end(done);
    });
});

describe('GET /todos/:id', () => {
    it('should return a todo doc', (done) => {
        request(app)
          .get(`/todos/${todos[0]._id.toHexString()}`)
          .set('x-auth', users[0].tokens[0].token)
          .expect(200)
          .expect((res) => {
              expect(res.body.todo.text).toBe(todos[0].text);
          })
          .end(done);

    });

    it('should not return a todo doc created by other user', (done) => {
        request(app)
          .get(`/todos/${todos[1]._id.toHexString()}`)
          .set('x-auth', users[0].tokens[0].token)
          .expect(404)
          .end(done);
    });


    it('should return 404 if todo not found', (done) => {
        var hexID = new ObjectID().toHexString();
        request(app)
          .get(`/todos/${hexID}`)
          .set('x-auth', users[0].tokens[0].token)
          .expect(404)
          .end(done);
    });
    it('should returm 400 for non-object ids', (done) => {
        request(app)
          .get('/todos/dfd123')
          .set('x-auth', users[0].tokens[0].token)
          .expect(404)
          .end(done);
        
    })
});


describe('DELETE /todos/:id', () => {
    it('should delete a todo doc', (done) => {
        var hexID = todos[1]._id.toHexString();
        request(app)
          .delete(`/todos/${hexID}`)
          .set('x-auth', users[1].tokens[0].token)
          .expect(200)
          .expect((res) => {
              expect(res.body.todo._id).toBe(hexID);
          })
          .end((err, res) => {
                if(err)
                    return done(err);
                Todo.findById(hexID).then((todo) => {
                    expect(todo).toBeFalsy();
                    done();
                }).catch((e) => done(e));
          });
    });

    it('should not delete a todo doc created by other user', (done) => {
        var hexID = todos[0]._id.toHexString();
        request(app)
          .delete(`/todos/${hexID}`)
          .set('x-auth', users[1].tokens[0].token)
          .expect(404)
          .end((err, res) => {
                if(err)
                    return done(err);
                Todo.findById(hexID).then((todo) => {
                    expect(todo).toBeTruthy();
                    done();
                }).catch((e) => done(e));
          });
    });

    it('should return 404 if todo not found', (done) => {
            var  hexID = new ObjectID().toHexString();
            request(app)
              .delete(`/todos/${hexID}`)
              .set('x-auth', users[1].tokens[0].token)
              .expect(404)
              .end(done);
    });
    it('should return 404 for non object id', (done) => {
        request(app)
          .delete('/todos/gfrt32')
          .set('x-auth', users[1].tokens[0].token)
          .expect(404)
          .end(done);

    });
});

describe('PATCH /todos/:id', () => {
    it('should update a todo doc', (done) => {
        var hexID = todos[0]._id.toHexString();
        request(app)
          .patch(`/todos/${hexID}`)
          .set('x-auth', users[0].tokens[0].token)
          .send({
              text: 'do homework',
              completed: true
            })
          .expect(200)
          .end((err, res) => {
              if(err)
                return done(err);
            Todo.findById(hexID).then((todo) => {
                expect(todo.text).toBe('do homework');
                expect(todo.completed).toBe(true);
                expect(typeof todo.completedAt).toBe('number');
                done();
            }).catch((e) => done(e));
          });
    });
    it('should not update a todo doc created by other user', (done) => {
        var hexID = todos[0]._id.toHexString();
        request(app)
          .patch(`/todos/${hexID}`)
          .set('x-auth', users[1].tokens[0].token)
          .send({
              text: 'do homework',
              completed: true
            })
          .expect(404)
          .end((err, res) => {
              if(err)
                return done(err);
            Todo.findById(hexID).then((todo) => {
                expect(todo.text).toBe(todos[0].text);
                expect(todo.completed).toBe(false);
                expect(todo.completedAt).toBeFalsy();
                done();
            }).catch((e) => done(e));
          });
    });
    it('should clear completedAt when todo is not complete', (done) => {
        var hexID = todos[1]._id.toHexString();
        request(app)
          .patch(`/todos/${hexID}`)
          .set('x-auth', users[1].tokens[0].token)
          .send({completed: false})
          .expect(200)
          .expect((res) => {
              expect(res.body.todo.completed).toBe(false);
              expect(res.body.completedAt).toBeFalsy();
          })
          .end(done);
    });
});

describe('GET /users/me', () => {
    it('should return user if authenticated', (done) => {
        request(app)
          .get('/users/me')
          .set('x-auth', users[0].tokens[0].token)
          .expect(200)
          .expect((res) => {
              expect(res.body._id).toBe(users[0]._id.toHexString());
              expect(res.body.email).toBe(users[0].email);
          })
          .end(done);
    });

    it('should return 401 if not authenticated', (done) => {
        request(app)
          .get('/users/me')
          .expect(401)
          .expect((res) => {
              expect(res.body).toEqual({});
          })
          .end(done);
    });
});

describe('POST /users', () => {
    it('should create a user', (done) => {
        var email = 'example@example.com';
        var password = 'testpassword';

        request(app)
          .post('/users')
          .send({email, password})
          .expect(200)
          .expect((res) => {
              expect(res.headers['x-auth']).toBeTruthy();
              expect(res.body._id).toBeTruthy();
              expect(res.body.email).toBe(email);
          })
          .end(((err) => {
              if(err) {
                  return done(err);
              }
              User.findOne({email}).then((user) => {
                  expect(user).toBeTruthy();
                  expect(user.password).not.toBe(password);
                  done();
              }).catch((err) => done(err));
          }));
    });

    it('should return validation error if request invalid', (done) => {
        var email = 'gfgfd@ff';
        var password = '24';
        request(app)
          .post('/users')
          .send({email, password})
          .expect(400)
          .end(done);
    });

    it('should not create user if email in use', (done) => {
        var password = 'Khoavo123';
        request(app)
          .post('/users')
          .send({email: users[0].email, password})
          .expect(400)
          .end(done);
    });
});

describe('POST /users/login', () => {
    it('should log in user and return auth token', (done) => {
        request(app)
          .post('/users/login')
          .send({
              email: users[1].email,
              password: users[1].password
          })
          .expect(200)
          .expect((res) => {
              expect(res.headers['x-auth']).toBeTruthy();
          })
          .end((err, res) => {
              if(err)
                return done(err);
              User.findById(users[1]._id).then((user) => {
                  expect(user.toObject().tokens[1]).toMatchObject({
                      'access': 'auth',
                      'token': res.headers['x-auth']
                  });
                  done();
              }).catch((err) => done(err));
          });
    });

    it('should reject invalid login', (done) => {
        request(app)
          .post('/users/login')
          .send({
              email: users[1].email + 'er',
              password: users[1].password + 'sdf'
          })
          .expect(400)
          .expect((res) => {
              expect(res.headers['x-auth']).toBeFalsy();
          })
          .end((err, res) => {
              if(err)
                return done(err);
              User.findById(users[1]._id).then((user) => {
                  expect(user.tokens.length).toBe(1);
                  done();
              }).catch((err) => done(err));
          });
    });
});

describe('DELETE /users/me/token', () => {
    it('should remove auth token on logout', (done) => {
        request(app)
          .delete('/users/me/token')
          .set('x-auth',users[0].tokens[0].token)
          .expect(200)
          .end((err, res) => {
              if(err)
                return done(err);
              User.findById(users[0]._id).then((user) => {
                  expect(user.tokens.length).toBe(0);
                  done();
              }).catch((err) => done(err));
          })
    })
})