/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /y              ->  index
 * POST    /y              ->  create
 * GET     /y/:id          ->  show
 * PUT     /y/:id          ->  upsert
 * PATCH   /y/:id          ->  patch
 * DELETE  /y/:id          ->  destroy
 */

'use strict';

import jsonpatch from 'fast-json-patch';
import {User, Task} from '../../sqldb';

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if(entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function patchUpdates(patches) {
  return function(entity) {
    try {
      // eslint-disable-next-line prefer-reflect
      jsonpatch.apply(entity, patches, /*validate*/ true);
    } catch(err) {
      return Promise.reject(err);
    }

    return entity.save();
  };
}

function removeEntity(res) {
  return function(entity) {
    if(entity) {
      return entity.destroy()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if(!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

// Gets a list of Tasks
export function index(req, res) {
  return Task.findAll({
      where: { UserId: req.user._id }
  })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a list of Tasks
export function all(req, res) {
  return Task.findAll({
      include: [User]
  })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Task from the DB
export function show(req, res) {
  return Task
    .find({
      where: {
        _id: req.params.id,
        UserId: req.user._id,
      }
    })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Task in the DB
export function create(req, res) {
  console.log(req.user);
  return Task.build(req.body)
    .set('UserId', req.user._id)
    .save()
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Upserts the given Task in the DB at the specified ID
export function upsert(req, res) {
  if(req.body._id) {
    Reflect.deleteProperty(req.body, '_id');
  }

  return Task
    .find({
      where: {
        _id: req.params.id,
        UserId: req.user._id,
      }
    })
    .then(task => {
      if(!task) return res.status(404).end('Not Found');
      return task.update(req.body).then(x => res.json(x));
    })
    .catch(handleError(res));
}

// Updates an existing Task in the DB
export function patch(req, res) {
  if(req.body._id) {
    Reflect.deleteProperty(req.body, '_id');
  }
  return Task.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(patchUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Task from the DB
export function destroy(req, res) {
  return Task.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
