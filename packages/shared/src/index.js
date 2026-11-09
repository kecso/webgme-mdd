/*globals define*/
define([
    './MermaidAst',
    './MetaBuilder',
    './JsonMetaImporter'
], function (MermaidAst, MetaBuilder, JsonMetaImporter) {
    'use strict';
    return {
        MermaidAst: MermaidAst,
        MetaBuilder: MetaBuilder,
        JsonMetaImporter: JsonMetaImporter
    };
});
