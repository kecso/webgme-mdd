/*globals define*/
define([
    './MermaidAst',
    './EarsAst',
    './MetaBuilder',
    './JsonMetaImporter'
], function (MermaidAst, EarsAst, MetaBuilder, JsonMetaImporter) {
    'use strict';
    return {
        MermaidAst: MermaidAst,
        EarsAst: EarsAst,
        MetaBuilder: MetaBuilder,
        JsonMetaImporter: JsonMetaImporter
    };
});
