const { execSync } = require('child_process');

// Install dependencies
execSync('npm install @actions/core @actions/github', { stdio: 'inherit' });

const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

async function run() {
    try {
        const token = core.getInput('github-token');
        const outputPath = core.getInput('output-path');
        const octokit = github.getOctokit(token);
        const context = github.context;

        // Collect build information
        const buildInfo = {
            builder: {
                id: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
            },
            buildType: 'https://github.com/actions/runner',
            invocation: {
                configSource: {
                    uri: `git+https://github.com/${context.repo.owner}/${context.repo.repo}.git`,
                    digest: {
                        sha1: context.sha
                    },
                    entryPoint: context.workflow
                },
                parameters: {},
                environment: {
                    github_workflow: context.workflow,
                    github_action: context.action,
                    github_event_name: context.eventName,
                    github_ref: context.ref,
                    github_sha: context.sha,
                    github_run_id: context.runId,
                    github_run_number: context.runNumber,
                    github_actor: context.actor,
                    github_repository: context.repository
                }
            }
        };

        // Get repository information
        const repoResponse = await octokit.rest.repos.get({
            owner: context.repo.owner,
            repo: context.repo.repo
        });

        // Generate provenance document
        const provenance =  {
                buildDefinition: {
                    buildType: buildInfo.buildType,
                    externalParameters: {},
                    internalParameters: {},
                    resolvedDependencies: []
                },
                runDetails: {
                    builder: buildInfo.builder,
                    metadata: {
                        invocationId: context.runId.toString(),
                        startedOn: new Date().toISOString(),
                        finishedOn: new Date().toISOString()
                    },
                    byproducts: []
                }
        };

        // Write provenance to file
        fs.writeFileSync(outputPath, JSON.stringify(provenance, null, 2));
        core.setOutput('provenance-path', outputPath);

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();