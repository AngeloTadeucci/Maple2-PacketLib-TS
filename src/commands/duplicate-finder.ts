import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import * as path from 'path';
import { getAllFiles, hashFile } from '../utils/helpers';

function commitExists(commitHash: string, repoPath: string): boolean {
  try {
    execSync(`git cat-file -e ${commitHash}`, { cwd: repoPath });
    return true;
  } catch (error) {
    return false;
  }
}

function getFilesAddedInCommit(commitHash: string, repoPath: string): string[] {
  if (!commitExists(commitHash, repoPath)) {
    console.error(`Commit ${commitHash} does not exist in the repository`);
    return [];
  }

  try {
    // Get the git root directory
    const gitRootDir = execSync('git rev-parse --show-toplevel', {
      cwd: repoPath,
    })
      .toString()
      .trim();

    const result = execSync(`git diff-tree --no-commit-id --name-only --diff-filter=A -r ${commitHash}`, {
      cwd: repoPath,
    });

    // Convert git paths (relative to git root) to absolute paths
    return result
      .toString()
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .filter(file => file.endsWith('.msb'))
      .map(file => path.resolve(gitRootDir, file))
      .filter(file => existsSync(file));
  } catch (error) {
    console.error('Error retrieving files from commit:', error);
    return [];
  }
}

export default async function duplicateFinder(
  folderPath: string,
  deleteDuplicates: boolean = false,
  dryRun: boolean = false,
  commitHash?: string
) {
  const allFiles = await getAllFiles(folderPath);

  const msbFiles = allFiles.filter(file => file.endsWith('.msb'));

  if (msbFiles.length === 0) {
    console.log('No MSB files found');
    return;
  }

  // If we have a commit hash, get files from that commit
  let filesFromCommit: string[] = [];

  if (commitHash) {
    if (!commitExists(commitHash, folderPath)) {
      console.error(`Commit ${commitHash} does not exist. Proceeding without commit filtering.`);
    } else {
      filesFromCommit = getFilesAddedInCommit(commitHash, folderPath);
      console.log(`Found ${filesFromCommit.length} MSB files added in commit ${commitHash}`);
    }
  }

  const hashes: { [key: string]: string[] } = {};

  let i = 1;
  for (const file of msbFiles) {
    const hash = await hashFile(file);
    if (hashes[hash]) {
      hashes[hash].push(file);
    } else {
      hashes[hash] = [file];
    }

    process.stdout.write(`Processed ${i}/${msbFiles.length}\r`);
    i++;
  }
  process.stdout.write('\n');

  const duplicates = Object.values(hashes).filter(files => files.length > 1);

  if (duplicates.length === 0) {
    console.log('No duplicates found');
    return;
  }

  for (const files of duplicates) {
    console.log(files);
  }

  console.log(`Found ${duplicates.length} duplicates`);

  if (!deleteDuplicates) {
    process.exit(1);
  }

  // If we have commit hash and files from that commit
  if (commitHash && filesFromCommit.length > 0) {
    for await (const files of duplicates) {
      // Check if any files in this set are from the commit
      const filesWithCommitInfo = files.map(file => ({
        path: file,
        isFromCommit: filesFromCommit.includes(file),
      }));

      const anyFromCommit = filesWithCommitInfo.some(file => file.isFromCommit);

      if (anyFromCommit) {
        console.log('\n=== Duplicate Set ===');
        // Show files and mark which are from commit
        for (const file of filesWithCommitInfo) {
          const marker = file.isFromCommit ? ' [FROM COMMIT]' : '';
          console.log(`${file.path}${marker}`);
        }

        // Delete only files from commit
        for await (const file of filesWithCommitInfo) {
          if (file.isFromCommit) {
            if (!dryRun) {
              console.log(`Deleting ${file.path}`);
              await unlink(file.path);
            } else {
              console.log(`[DRY RUN] Would delete ${file.path}`);
            }
          }
        }

        continue;
      }

      if (!dryRun) {
        for await (const file of files.slice(1)) {
          console.log(`Deleting ${file}`);
          await unlink(file);
        }
      } else {
        for (const file of files.slice(1)) {
          console.log(`[DRY RUN] Would delete ${file}`);
        }
      }
    }

    return;
  }

  for await (const files of duplicates) {
    if (!dryRun) {
      for await (const file of files.slice(1)) {
        console.log(`Deleting ${file}`);
        await unlink(file);
      }
    } else {
      for (const file of files.slice(1)) {
        console.log(`[DRY RUN] Would delete ${file}`);
      }
    }
  }
}
