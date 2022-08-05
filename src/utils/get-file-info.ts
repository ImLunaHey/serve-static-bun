import type { Errorlike, FileBlob } from "bun";

function getMimeType({ type }: FileBlob): string {
	return type.indexOf(";charset") !== -1 ? type.substring(0, type.indexOf(";charset")) : type;
}

function isErrorlike(error: any): error is Errorlike {
	return !!(error as Errorlike).code;
}

export default async function getFileInfo(path: string): Promise<{ blob: FileBlob; exists: boolean; isFile: boolean; mimeType: string; }> {
	const info = {
		blob: Bun.file(path),
		exists: false,
		isFile: false,
		mimeType: null,
	};

	try {
		await info.blob.arrayBuffer();
		info.exists = true;
		info.isFile = true;
		info.mimeType = getMimeType(info.blob);
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
