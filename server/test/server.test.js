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
          .expect(200)
          .expect((res) => {
            expect(res.body.todos.length).toBe(2);
          })
          .end(done);
    });
});

describe('GET /todos/:id', () => {
    it('should return a todo doc', (done) => {
        request(app)
          .get(`/todos/${todos[0]._id.toHexString()}`)
          .expect(200)
          .expect((res) => {
              expect(res.body.todo.text).toBe(todos[0].text);
          })
          .end(done);

    });
    it('should return 404 if todo not found', (done) => {
        var hexID = new ObjectID().toHexString();
        request(app)
          .get(`/todos/${hexID}`)
          .expect(404)
          .end(done);
    });
    it('should returm 400 for non-object ids', (done) => {
        request(app)
          .get('/todos/dfd123')
          .expect(404)
          .end(done);
        
    })
});


describe('DELETE /todos/:id', () => {
    it('should delete a todo doc', (done) => {
        request(app)
          .delete(`/todos/${todos[0]._id.toHexString()}`)
          .expect(200)
          .expect((res) => {
              expect(res.body.todo.text).toBe(todos[0].text);
          })
          .end((err, res) => {
                if(err)
                    return done(err);
                Todo.findById(todos[0]._id).then((todo) => {
                    expect(todo).toNotExist();
                    done();
                }).catch((e) => done(e));
          });
    });
    it('should return 404 if todo not found', (done) => {
            var  hexID = new ObjectID().toHexString();
            request(app)
              .delete(`/todos/${hexID}`)
              .expect(404)
              .end(done);
    });
    it('should return 404 for non object id', (done) => {
        request(app)
          .delete('/todos/gfrt32')
          .expect(404)
          .end(done);

    });
});

describe('PATCH /todos/:id', () => {
    it('should update a todo doc', (done) => {
        var hexID = todos[0]._id.toHexString();
        request(app)
          .patch(`/todos/${hexID}`)
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
                expect(todo.completedAt).toBeA('number');
                done();
            }).catch((e) => done(e));
          });
    });
    it('should clear completedAt when todo is not complete', (done) => {
        var hexID = todos[1]._id.toHexString();
        request(app)
          .patch(`/todos/${hexID}`)
          .send({completed: false})
          .expect(200)
          .expect((res) => {
              expect(res.body.todo.completed).toBe(false);
              expect(res.body.completedAt).toNotExist();
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
        var email = 'test@gmail.com';
        var password = 'testpassword';

        request(app)
          .post('/users')
          .send({email, password})
          .expect(200)
          .expect((res) => {
              expect(res.headers['x-auth']).toExist();
              expect(res.body.email).toBe(email);
          })
          .end(((err) => {
              if(err) {
                  return done(err);
              }
              User.findOne({email}).then((user) => {
                  expect(user).toExist();
                  expect(user.password).toNotBe(password);
                  done();
              })
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
})