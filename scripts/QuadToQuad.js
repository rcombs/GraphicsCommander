function Det(a, b, c, d){
    return a*d - b*c;
}

function mapSquareToQuad(quad){
    var SQ = Matrix.Zero(3, 3);
    var px = quad.e(1, 1) - quad.e(2, 1) + quad.e(3, 1) - quad.e(4, 1);
    var py = quad.e(1, 2) - quad.e(2, 2) + quad.e(3, 2) - quad.e(4, 2);
    if(Math.abs(px) < 1e-10 && Math.abs(py) < 1e-10){
        SQ.setElements([
            [quad.e(2,1) - quad.e(1,1), quad.e(2,2) - quad.e(1,2), 0],
            [quad.e(3,1) - quad.e(2,1), quad.e(3,2) - quad.e(2,2), 0],
            [quad.e(1,1), quad.e(1,2), 1]
        ]);
        return SQ;
    }else{
        var dx1 = quad.e(2,1) - quad.e(3,1);
        var dx2 = quad.e(4,1) - quad.e(3,1);
        var dy1 = quad.e(2,2) - quad.e(3,2);
        var dy2 = quad.e(4,2) - quad.e(3,2);
        var det = Det(dx1, dx2, dy1, dy2);
        if(det == 0){
            return null;
        }
        var s13 = Det(px, dx2, py, dy2) / det;
        var s23 = Det(dx1, px, dy1, py) / det;
        SQ.setElements([
            [quad.e(2,1) - quad.e(1,1) + s13 * quad.e(2,1), quad.e(2,2) - quad.e(1,2) + s13 * quad.e(2,2), s13],
            [quad.e(4,1) - quad.e(1,1) + s23 * quad.e(4,1), quad.e(4,2) - quad.e(1,2) + s23 * quad.e(4,2), s23],
            [quad.e(1,1), quad.e(1,2), 1]
        ]);
        return SQ;
    }
}

function fillArray(length, value){
    var arr = [];
    for(var i = 0; i < length; i++){
        arr.push(value);
    }
    return arr;
}

function colonThing(matrix1){
    var matrix2 = Matrix.Zero(matrix1.rows() - 1, matrix1.cols());
    var arr = [];
    for(var i = 0; i < matrix1.rows() - 1; i++){
        arr[i] = [];
        for(var j = 0; j < matrix1.cols(); j++){
            arr[i][j] = matrix1.e(i + 1, j + 1) / matrix1.e(matrix1.rows(), j + 1);
        }
    }
    matrix2.setElements(arr);
    return matrix2;
}

function mapQuadToSquare(quad){
    return mapSquareToQuad(quad).inv();
}

function mapQuadToQuad(a, b){
    return mapQuadToSquare(a).x(mapSquareToQuad(b));
}

function perstrans(X, t){
    X = X.augment($V(fillArray(X.rows(), 1))).transpose();
    var y = t.transpose().x(X);
    var z = colonThing(y);
    return z.transpose();
}