import type { Errorlike, FileBlob } from "bun";

function isErrorlike(error: any): error is Errorlike {
	return !!(error as Errorlike).code;
}

export default async function getFileInfo(path: string): Promise<{ blob: FileBlob; exists: boolean; isFile: boolean }> {
	const info = {
		blob: Bun.file(path),
		exists: false,
		isFile: false,
	};

	try {
		await info.blob.arrayBuffer();
		info.exists = true;
		info.isFile = true;
	} catch (error) {
		if (isErrorlike(error)) {
			switch (error.code) {
				case "EISDIR":
					info.exists = true;
					break;
			}
		}
	}

	return info;
}
