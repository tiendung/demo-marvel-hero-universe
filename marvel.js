/*jslint indent: 2, nomen: true, maxlen: 100 */
/*global require, applicationContext */

////////////////////////////////////////////////////////////////////////////////
/// @brief A user profile management Foxx  written for ArangoDB and Angular JS
///
/// @file
///
/// DISCLAIMER
///
/// Copyright 2010-2012 triagens GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is triAGENS GmbH, Cologne, Germany
///
/// @author Michael Hackstein
/// @author Copyright 2011-2013, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

(function () {
  "use strict";
  var _ = require("underscore"),
    db = require("internal").db,
    joi = require("joi"),
    edges,
    vertices;

  vertices = db._collection("marvel_vertices");
  edges = db._collection("marvel_edges");

  const createRouter = require('@arangodb/foxx/router');
  const router = createRouter();
  module.context.use(router);

  /** Do a like search on all hero names
   *
   * This function simply returns the list of all heroes containing the given string.
   */
  router.get('/search/:content', function (req, res) {
    var searchString = req.param("content");

    var q = `
      FOR hero IN marvel_vertices
      FILTER LIKE(hero.name, '%${searchString}%', true)
      RETURN hero
    `;
    console.log(q.replace(/\s+/g, ' '));
    var heroes = db._query(q).toArray();
    
    res.json(_.map(heroes, function (h) {
      return h;
    }));
  });

  /** Get the neighbourhood of a specific hero
   *
   * This function returns all friends of a hero.
   */
  router.get('/hero/:id', function (req, res) {
    var key = req.param("id");
    var id = vertices.name() + "/" + key;
    var allHeros = {};
    var start = vertices.document(id);
    _.each(edges.outEdges(id), function(e) {
      _.each(edges.inEdges(e._to), function(edge){
        if (edge._from === id) return;
        var hero = vertices.document(edge._from);
        allHeros[hero._key] = allHeros[hero._key] || {
          count:0,
          _id: hero._id,
          _key: hero._key,
          name: hero.name
        };
        allHeros[hero._key].count++;
      });
    });
    var top10 = _.last(
      _.sortBy(
        _.values(allHeros), "count"
      ), 10
    );
    var result = {
      nodes: [],
      edges: [] 
    };
    result.nodes.push(start);
    _.each(top10, function(n) {
        var _key = n._key + "-" + key;
        var _eid = "edges/" + _key;
        result.edges.push({
            _id: _eid,
            _key: _key,
            _to: n._id,
            _from: id,
            weight: n.count
        });
        result.nodes.push(n);
    });
    res.json(result);
  });
}());
