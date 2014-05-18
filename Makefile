version = $(shell cat package.json | grep version | awk -F'"' '{print $$4}')
PROJ_ROOT=$(CURDIR)


install:
	@spm install

build:
	@spm build
	@googlecc ${PROJ_ROOT}/src/seer-monitor.js ${PROJ_ROOT}/dist/seer-monitor.js
	@googlecc ${PROJ_ROOT}/src/seer-jsniffer.js ${PROJ_ROOT}/dist/seer-jsniffer.js
	@cat ${PROJ_ROOT}/dist/seer-monitor.js > ${PROJ_ROOT}/dist/seer.js
	@cat ${PROJ_ROOT}/dist/seer-jsniffer.js >> ${PROJ_ROOT}/dist/seer.js
	@rm ${PROJ_ROOT}/dist/seer-monitor.js ${PROJ_ROOT}/dist/seer-jsniffer.js
	@cat ${PROJ_ROOT}/src/seer-monitor.js > ${PROJ_ROOT}/dist/seer-debug.js
	@cat ${PROJ_ROOT}/src/seer-jsniffer.js >> ${PROJ_ROOT}/dist/seer-debug.js

build-doc:
	@spm doc build

publish:
	@spm publish
	@spm doc publish
	@git tag $(version)
	@git push origin $(version)

watch:
	@spm doc watch

publish-doc: clean build-doc
	@spm doc publish

clean:
	@rm -fr _site


reporter = spec
url = tests/runner.html
test:
	@spm test

coverage:
	@rm -fr _site/src-cov
	@jscoverage --encoding=utf8 src _site/src-cov
	@$(MAKE) test reporter=json-cov url=tests/runner.html?coverage=1 | node $(THEME)/html-cov.js > tests/coverage.html
	@echo "Build coverage to tests/coverage.html"


.PHONY: build-doc debug server publish clean test coverage
